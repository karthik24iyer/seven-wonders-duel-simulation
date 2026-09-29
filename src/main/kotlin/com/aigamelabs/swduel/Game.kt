package com.aigamelabs.swduel

import com.aigamelabs.game.Player
import com.aigamelabs.utils.RandomWithTracker
import com.aigamelabs.swduel.enums.GameOutcome
import com.aigamelabs.swduel.enums.GamePhase
import com.aigamelabs.game.PlayerTurn
import com.aigamelabs.utils.MinimalFormatter
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import java.nio.file.Paths
import java.util.logging.*
import javax.json.Json
import javax.json.stream.JsonGenerator


/**
 * Workflow:
 *
 * The Game class has a game loop and a queue of decisions.
 * At every iteration, the following steps are executed:
 * - Check if there are more decisions to make
 * - If not, terminate the game
 * - If yes:
 *  - Fetch the top one
 *  - Query the AI about the decision (ie pass it the game state and its options).
 *    The query function takes a GameState and a list of Action instances and returns an Action (@see Player.decide).
 *  - Check that the returned Action is actually from the list that was passed (i.e. no cheating).
 *  - Call the `process` method of the decided Action, which takes a GameState and returns a GameState.
 *    The `process` method also takes care of adding new decisions to the queue, if any.
 *  - Repeat
 */
class Game(
        private val gameId: String,
        private val players : Map<PlayerTurn, Player<GameState>>,
        private val logPath: String,
        /** Free-form settings copied verbatim into the summary file (controllers, budgets, ...) */
        private val meta: Map<String, Any> = emptyMap()
) {

    private val logger = Logger.getLogger("SevenWondersDuel_Messages")

    init {

        val level = Level.INFO
        while (!logger.handlers.isEmpty())
            logger.removeHandler(logger.handlers[0])
        logger.level = level
        logger.useParentHandlers = false

        val fileHandler = FileHandler(Paths.get(logPath, "${gameId}_game.log").toAbsolutePath().toString())
        fileHandler.formatter = MinimalFormatter()
        fileHandler.level = level
        logger.addHandler(fileHandler)

        val consoleHandler = ConsoleHandler()
        consoleHandler.formatter = MinimalFormatter()
        consoleHandler.level = level
        logger.addHandler(consoleHandler)

    }

    private val file = File(Paths.get(logPath, "${gameId}_game.json").toAbsolutePath().toString())
    private val fos = FileOutputStream(file, false)
    private val properties = mapOf(Pair(JsonGenerator.PRETTY_PRINTING, true))
    private val jgf = Json.createGeneratorFactory(properties)
    private val jsonGen = jgf.createGenerator(fos)

    // Compact per-game record for the UI: one entry per move instead of the full state dump above
    private val steps = JSONArray()
    private val cardColors = JSONObject()

    /** Victory points, or null once the pawn reaches a capital: the engine refuses to score a military supremacy. */
    private fun victoryPoints(gameState: GameState, player: PlayerTurn): Any =
            if (Math.abs(gameState.militaryBoard.conflictPawnPosition) >= 9) JSONObject.NULL
            else gameState.calculateVictoryPoints(player)

    private fun cityJson(gameState: GameState, player: PlayerTurn): JSONObject {
        val city = gameState.getPlayerCity(player)
        val names = { cards: Iterable<Card> ->
            JSONArray(cards.map { cardColors.put(it.name, it.color.toString()); it.name }.sorted())
        }
        return JSONObject()
                .put("coins", city.coins)
                .put("vp", victoryPoints(gameState, player))
                .put("science", gameState.countScienceSymbols(player))
                .put("buildings", names(city.buildings))
                .put("wonders", names(city.wonders))
                .put("unbuilt", names(city.unbuiltWonders))
                .put("tokens", names(city.progressTokens))
    }

    private fun writeSummary(gameState: GameState, outcome: GameOutcome, durationMs: Long) {
        val summary = JSONObject(meta)
                .put("game_id", gameId)
                .put("outcome", outcome.toString())
                .put("victory_type", gameState.gamePhase.toString())
                .put("p1_vp", victoryPoints(gameState, PlayerTurn.PLAYER_1))
                .put("p2_vp", victoryPoints(gameState, PlayerTurn.PLAYER_2))
                .put("pawn", gameState.militaryBoard.conflictPawnPosition)
                .put("moves", steps.length())
                .put("duration_ms", durationMs)
                .put("card_colors", cardColors)
                .put("steps", steps)
        // Write-then-rename so the UI server, which polls for this file, never reads half of it
        val tmp = File(logPath, "summary.json.tmp")
        tmp.writeText(summary.toString())
        tmp.renameTo(File(logPath, "summary.json"))
    }

    fun mainLoop(startingGameState : GameState, generator : RandomWithTracker) {
        val startedAt = System.currentTimeMillis()

        try {
            jsonGen.writeStartArray()
            startingGameState.toJson(jsonGen)

            players.forEach { it.value.init() }

            // Play the game
            var gameState = startingGameState
            while (!gameState.isGameOver()) {
                gameState = iterate(gameState, generator)
                //logger.log(Level.INFO, gameState.toString())
            }

            players.forEach { it.value.close() }

            jsonGen.writeEnd()
            jsonGen.close() // without this the closing bracket never reaches the file

            // Determine winner
            val gameOutcome = gameState.calculateWinner(logger)
            val outcome = gameOutcome.first
            writeSummary(gameState, outcome, System.currentTimeMillis() - startedAt)
            val p1VictoryPoints = gameOutcome.second
            val p2VictoryPoints = gameOutcome.third
            when (gameState.gamePhase) {
                GamePhase.CIVILIAN_VICTORY -> when (outcome) {
                    GameOutcome.PLAYER_1_VICTORY -> logger?.info("Player 1 wins with $p1VictoryPoints versus $p2VictoryPoints")
                    GameOutcome.PLAYER_2_VICTORY -> logger?.info("Player 2 wins with $p1VictoryPoints versus $p2VictoryPoints")
                    GameOutcome.TIE -> logger?.info("Players scored the same amount of points: $p1VictoryPoints")
                }
                GamePhase.SCIENCE_SUPREMACY -> when (outcome) {
                    GameOutcome.PLAYER_1_VICTORY -> logger?.info("Player 1 wins with Science Supremacy")
                    GameOutcome.PLAYER_2_VICTORY -> logger?.info("Player 2 wins with Science Supremacy")
                    GameOutcome.TIE -> throw Exception("You cannot have Science Supremacy and a tie")
                }
                GamePhase.MILITARY_SUPREMACY -> when (outcome) {
                    GameOutcome.PLAYER_1_VICTORY -> logger?.info("Player 1 wins with Military Supremacy")
                    GameOutcome.PLAYER_2_VICTORY -> logger?.info("Player 2 wins with Military Supremacy")
                    GameOutcome.TIE -> throw Exception("You cannot have Military Supremacy and a tie")
                }
                else -> throw Exception("The game is not over yet; current phase is ${gameState.gamePhase}")
            }
        }
        catch (e: Exception) {
            logger?.log(Level.SEVERE, e.message, e)

            throw e
        }
    }

    /**
     * Advances the game by one step by querying the appropriate player for the next decision in the queue and applying
     * the returned action.
     */
    private fun iterate(gameState: GameState, generator: RandomWithTracker): GameState {

        // Dequeue decision and enqueue the next one
        var (gameState_, thisDecision) = gameState.dequeDecision()

        val queried = thisDecision.options.size() > 1
        val action = if (queried) {
            // Query player for action
            logger?.info("Querying ${thisDecision.player}; options:\n" +
                    thisDecision.options
                            .map { "  $it\n" }
                            .fold("") { a, b -> a + b } + "\n"
            )
            players[thisDecision.player]!!.decide(gameState)
        }
        else {
            logger?.info("Skipping query for ${thisDecision.player} (only one option)\n" +
                    thisDecision.options
                            .map { "  $it\n" }
                            .fold("") { a, b -> a + b } + "\n"
            )
            thisDecision.options[0]
        }
        logger?.info("${thisDecision.player} chose: $action\n\n")


        // Check for cheating
        if (!thisDecision.options.contains(action)) {
            throw Exception("Player cheated: selected action\n" + action +
                    "\nbut available actions are\n" + thisDecision.options)
        }

        // Process action
        gameState_= action.process(gameState_, generator, logger)
        logger.handlers.forEach { it.flush() }

        steps.put(JSONObject()
                .put("player", PlayerTurn.getPlayerNumber(thisDecision.player))
                .put("action", action.toString())
                .put("options", thisDecision.options.size())
                .put("note", if (queried) players[thisDecision.player]!!.lastDecisionNote() else null)
                .put("values", if (queried) players[thisDecision.player]!!.lastDecisionValues()?.let { JSONObject(it) } else null)
                .put("phase", gameState_.gamePhase.toString())
                .put("pawn", gameState_.militaryBoard.conflictPawnPosition)
                .put("p1", cityJson(gameState_, PlayerTurn.PLAYER_1))
                .put("p2", cityJson(gameState_, PlayerTurn.PLAYER_2)))

        jsonGen.write(action.toString())
        gameState_.toJson(jsonGen)
        jsonGen.flush()

        return gameState_
    }

}