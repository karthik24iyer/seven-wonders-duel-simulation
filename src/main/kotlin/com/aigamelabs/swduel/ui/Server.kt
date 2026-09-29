package com.aigamelabs.swduel.ui

import com.sun.net.httpserver.HttpExchange
import com.sun.net.httpserver.HttpServer
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.net.InetSocketAddress
import java.text.SimpleDateFormat
import java.util.*
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

/**
 * Local web UI for running batches of bot-vs-bot games ("runs") and browsing their results.
 *
 * Every game is a separate `swduel.Main` JVM: the engine uses process-wide loggers and System.exit, so games cannot
 * share a JVM. Everything lives on disk under logs/ui/<run id>/ so runs survive a restart of this server:
 *
 *   settings.json          what the run was started with
 *   finished.json          written when the run ends (or is stopped)
 *   game_<n>/summary.json  written by Game when game n completes
 *   game_<n>/failed        marker written here when the JVM exits non-zero
 */
object Server {
    private const val PORT = 8377
    private val CONTROLLERS = setOf("MCTS", "MCTS_Opportunist", "MCTS_Civilian", "MCTS_Science", "MCTS_Military", "Random")
    private val ID = Regex("[0-9A-Za-z_-]{1,40}")
    private val root = File("logs/ui")
    private val cores = Runtime.getRuntime().availableProcessors()
    /** Each game keeps ~4 cores busy; never commit more than half the machine. */
    private val maxParallel = Math.max(1, cores / 8)

    private class Run(val id: String, val pool: ExecutorService) {
        val startedAt = System.currentTimeMillis()
        @Volatile var stopped = false
        val processes: MutableSet<Process> = ConcurrentHashMap.newKeySet()
        val running: MutableSet<Int> = ConcurrentHashMap.newKeySet()
    }

    // ponytail: one run at a time. Bots already use 4 threads per game, so concurrent runs would only
    // fight over cores and wreck the time estimate. Queue runs if that ever becomes a need.
    @Volatile private var current: Run? = null

    /** summary.json minus the move list, per finished game; a finished game never changes so this never invalidates. */
    private val headers = ConcurrentHashMap<String, JSONObject>()

    @JvmStatic
    fun main(args: Array<String>) {
        root.mkdirs()
        val server = try {
            HttpServer.create(InetSocketAddress("127.0.0.1", PORT), 0) // loopback only: this can spawn processes
        } catch (e: java.net.BindException) {
            println("\n  The simulator is already running: open http://localhost:$PORT" +
                    "\n  (to restart it instead, stop the other one first:  pkill -f swduel.ui.Server)\n")
            return
        }
        server.createContext("/") { exchange ->
            try {
                route(exchange)
            } catch (e: BadRequest) {
                exchange.send(e.code, JSONObject().put("error", e.message).toString())
            } catch (e: Exception) {
                e.printStackTrace()
                exchange.send(500, JSONObject().put("error", e.toString()).toString())
            }
        }
        server.executor = Executors.newFixedThreadPool(4)
        Runtime.getRuntime().addShutdownHook(Thread { current?.let { stop(it) } }) // don't leave games running after Ctrl-C
        server.start()
        println("\n  7 Wonders Duel simulator:  http://localhost:$PORT\n")
    }

    private class BadRequest(val code: Int, message: String) : Exception(message)

    private fun route(exchange: HttpExchange) {
        val method = exchange.requestMethod
        val path = exchange.requestURI.path.trim('/').split('/').filter { it.isNotEmpty() }
        if (method == "POST" && exchange.requestHeaders.getFirst("Content-Type")?.startsWith("application/json") != true)
            throw BadRequest(415, "POST needs Content-Type: application/json") // also stops other websites from POSTing here

        when {
            method == "GET" && path.isEmpty() ->
                exchange.send(200, Server::class.java.getResource("/ui/index.html")!!.readText(), "text/html; charset=utf-8")
            method == "GET" && path == listOf("api", "info") ->
                exchange.send(200, JSONObject().put("cores", cores).put("max_parallel", maxParallel).put("running", current?.id ?: JSONObject.NULL).toString())
            method == "GET" && path == listOf("api", "runs") ->
                exchange.send(200, JSONArray(runDirs().map { runStatus(it, withGames = false) }).toString())
            method == "POST" && path == listOf("api", "runs") ->
                exchange.send(200, JSONObject().put("id", start(JSONObject(String(exchange.requestBody.readNBytes(65536))))).toString())
            method == "GET" && path.size == 3 && path[1] == "runs" ->
                exchange.send(200, runStatus(runDir(path[2]), withGames = true).toString())
            method == "POST" && path.size == 4 && path[1] == "runs" && path[3] == "stop" -> {
                current?.takeIf { it.id == path[2] }?.let { stop(it) }
                exchange.send(200, "{}")
            }
            method == "GET" && path.size == 5 && path[1] == "runs" && path[3] == "games" -> {
                val n = path[4].toIntOrNull() ?: throw BadRequest(400, "Bad game number")
                val summary = File(runDir(path[2]), "game_$n/summary.json")
                if (!summary.exists()) throw BadRequest(404, "No such game")
                exchange.send(200, summary.readText())
            }
            else -> throw BadRequest(404, "Not found")
        }
    }

    private fun HttpExchange.send(code: Int, body: String, type: String = "application/json") {
        val bytes = body.toByteArray()
        responseHeaders.add("Content-Type", type)
        responseHeaders.add("Cache-Control", "no-store")
        sendResponseHeaders(code, bytes.size.toLong())
        responseBody.use { it.write(bytes) }
    }

    private fun runDirs() = (root.listFiles() ?: emptyArray())
            .filter { File(it, "settings.json").exists() }
            .sortedByDescending { it.name }

    private fun runDir(id: String): File {
        if (!ID.matches(id)) throw BadRequest(400, "Bad run id")
        return File(root, id).takeIf { File(it, "settings.json").exists() } ?: throw BadRequest(404, "No such run")
    }

    private fun header(runId: String, n: Int, summaryFile: File) = headers.getOrPut("$runId/$n") {
        val summary = JSONObject(summaryFile.readText())
        val last = summary.getJSONArray("steps").let { it.getJSONObject(it.length() - 1) }
        summary.remove("steps")
        summary.remove("card_colors")
        for (p in listOf("p1", "p2")) {
            val city = last.getJSONObject(p)
            summary.put("${p}_wonders", city.getJSONArray("wonders").length())
            summary.put("${p}_science", city.getInt("science"))
            summary.put("${p}_coins", city.getInt("coins"))
        }
        summary.put("n", n)
    }

    private fun runStatus(dir: File, withGames: Boolean): JSONObject {
        val settings = JSONObject(File(dir, "settings.json").readText())
        val total = settings.getInt("games")
        val live = current?.takeIf { it.id == dir.name }
        val finished = File(dir, "finished.json").takeIf { it.exists() }?.let { JSONObject(it.readText()) }

        val games = JSONArray()
        var done = 0
        val failed = JSONArray()
        for (n in 1..total) {
            val summary = File(dir, "game_$n/summary.json")
            if (summary.exists()) {
                done++
                if (withGames) games.put(header(dir.name, n, summary))
            } else if (File(dir, "game_$n/failed").exists())
                failed.put(n)
        }
        val status = JSONObject()
                .put("id", dir.name)
                .put("settings", settings)
                .put("done", done)
                .put("failed", failed)
                .put("running", live?.running?.sorted() ?: emptyList<Int>())
                // "interrupted" = the server died mid-run; whatever finished is still browsable
                .put("state", if (live != null) "running" else if (finished == null) "interrupted"
                              else if (finished.getBoolean("stopped")) "stopped" else "finished")
                .put("elapsed_ms", finished?.getLong("elapsed_ms") ?: live?.let { System.currentTimeMillis() - it.startedAt } ?: 0)
        if (withGames) status.put("games", games)
        return status
    }

    private fun JSONObject.intIn(key: String, range: IntRange, default: Int): Int {
        val value = optInt(key, default)
        if (value !in range) throw BadRequest(400, "$key must be between ${range.first} and ${range.last}")
        return value
    }

    @Synchronized
    private fun start(request: JSONObject): String {
        if (current != null) throw BadRequest(409, "A run is already in progress")

        // Re-build the settings from validated values only; never pass request text through to the command line
        val controller = { key: String ->
            request.optString(key, "MCTS").also { if (it !in CONTROLLERS) throw BadRequest(400, "Unknown strategy $it") }
        }
        val wonders = request.optString("wonders", "draft")
        if (wonders != "draft" && wonders != "random") throw BadRequest(400, "wonders must be 'draft' or 'random'")
        val settings = JSONObject()
                .put("p1", controller("p1"))
                .put("p2", controller("p2"))
                .put("wonders", wonders)
                .put("games", request.intIn("games", 1..10_000, 100))
                .put("playouts", request.intIn("playouts", 0..10_000_000, 5_000))
                .put("millis", request.intIn("millis", 0..600_000, 0))
                .put("parallel", request.intIn("parallel", 1..maxParallel, 1))
        if (settings.getInt("playouts") == 0 && settings.getInt("millis") == 0)
            throw BadRequest(400, "Set a limit on imagined games, on thinking time, or both")

        val id = SimpleDateFormat("yyyy-MM-dd_HH-mm-ss").format(Date())
        val dir = File(root, id)
        dir.mkdirs()
        File(dir, "settings.json").writeText(settings.toString(2))

        val run = Run(id, Executors.newFixedThreadPool(settings.getInt("parallel")))
        current = run
        val futures = (1..settings.getInt("games")).map { n -> run.pool.submit { playGame(run, dir, n, settings) } }
        Thread {
            futures.forEach { try { it.get() } catch (e: Exception) { e.printStackTrace() } }
            run.pool.shutdown()
            File(dir, "finished.json").writeText(JSONObject()
                    .put("stopped", run.stopped)
                    .put("elapsed_ms", System.currentTimeMillis() - run.startedAt).toString())
            current = null
        }.start()
        return id
    }

    private fun playGame(run: Run, dir: File, n: Int, settings: JSONObject) {
        if (run.stopped) return
        val gameDir = File(dir, "game_$n")
        gameDir.mkdirs()
        val java = ProcessHandle.current().info().command().orElse("java")
        // One game keeps ~4 cores busy (measured). At normal priority a few of them starve the desktop badly enough
        // to hang it, so games run niced: they still use every idle core but give way to anything interactive.
        // SerialGC because the default collector adds ~13 GC threads per JVM for no gain on a 1 GB heap.
        val process = ProcessBuilder("nice", "-n", "15", java, "-XX:+UseSerialGC",
                "-Dswduel.mcts.playouts=${settings.getInt("playouts")}",
                "-Dswduel.mcts.millis=${settings.getInt("millis")}",
                "-cp", System.getProperty("java.class.path"),
                "com.aigamelabs.swduel.Main",
                "-P1", settings.getString("p1"),
                "-P2", settings.getString("p2"),
                "-W", settings.getString("wonders"),
                "-L", gameDir.path)
                .redirectErrorStream(true)
                .redirectOutput(File(gameDir, "stdout.txt"))
                .start()
        run.processes.add(process)
        run.running.add(n)
        try {
            if (process.waitFor() != 0 && !run.stopped) File(gameDir, "failed").writeText("exit code ${process.exitValue()}")
        } finally {
            run.processes.remove(process)
            run.running.remove(n)
        }
    }

    private fun stop(run: Run) {
        run.stopped = true
        run.processes.forEach { it.destroy() }
    }
}
