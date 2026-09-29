package com.aigamelabs.swduel

import com.aigamelabs.game.GameData
import com.aigamelabs.game.Player
import com.aigamelabs.game.PlayerTurn
import com.aigamelabs.swduel.players.*
import com.aigamelabs.utils.RandomWithTracker
import org.json.JSONObject
import java.io.IOException
import java.nio.charset.Charset
import java.nio.file.Files
import java.nio.file.Paths
import java.text.SimpleDateFormat
import java.util.*
import org.apache.commons.cli.Option
import org.apache.commons.cli.Options
import org.apache.commons.cli.DefaultParser

class Main {
    companion object {

        @JvmStatic
        private fun buildArgParser(): Options {
            val optionP1 = Option.builder("P1")
                    .required(true)
                    .hasArg()
                    .desc("Controller for Player 1 (one of MCTS, MCTS_Civilian, MCTS_Science, MCTS_Military, DDA, Human, Random)")
                    .longOpt("player1")
                    .build()
            val optionP2 = Option.builder("P2")
                    .required(true)
                    .hasArg()
                    .desc("Controller for Player 2 (one of MCTS, MCTS_Civilian, MCTS_Science, MCTS_Military, DDA, Human, Random)")
                    .longOpt("player2")
                    .build()
            val optionLogs = Option.builder("L")
                    .required(true)
                    .hasArg()
                    .desc("The S option")
                    .longOpt("logs-folder")
                    .build()
            val optionInit = Option.builder("S")
                    .hasArg()
                    .desc("Location of JSON file containing the initial state")
                    .longOpt("initial-state")
                    .build()
            val optionWonders = Option.builder("W")
                    .hasArg()
                    .desc("How wonders are assigned: 'draft' (default; players pick per the rules) or 'random' (4 dealt to each)")
                    .longOpt("wonders")
                    .build()
            val options = Options()
            options.addOption(optionWonders)
            options.addOption(optionP1)
            options.addOption(optionP2)
            options.addOption(optionLogs)
            options.addOption(optionInit)
            return options
        }

        @JvmStatic
        fun main(args: Array<String>) {
            val options = buildArgParser()
            val parser = DefaultParser()
            val commandLine = parser.parse(options, args)

            val logsLocation = commandLine.getOptionValue("L")
            val player1Controller = commandLine.getOptionValue("P1")
            val player2Controller = commandLine.getOptionValue("P2")
            val initGameStateLocation = commandLine.getOptionValue("S")
            val wondersMode = commandLine.getOptionValue("W", "draft")
            if (wondersMode != "draft" && wondersMode != "random")
                throw Exception("Unknown wonders mode $wondersMode (expected 'draft' or 'random')")

            val generator = RandomWithTracker(Random().nextLong(), true)
            val initGameState = if (commandLine.hasOption("S")) {
                val content = readFile(initGameStateLocation, Charset.defaultCharset())
                GameState.loadFromJson(JSONObject(content))
            }
            else if (wondersMode == "random")
                GameStateFactory.createNewGameStateWithRandomWonders(generator)
            else
                GameStateFactory.createNewGameState(generator)


            val gameId = SimpleDateFormat("yyyy-MM-dd HH.mm.ss").format(Calendar.getInstance().time)
            val gameData = GameData(listOf(player1Controller, player2Controller))
            val player1 = Pair(PlayerTurn.PLAYER_1, getPlayer(PlayerTurn.PLAYER_1, player1Controller, gameData, gameId, logsLocation))
            val player2 = Pair(PlayerTurn.PLAYER_2, getPlayer(PlayerTurn.PLAYER_2, player2Controller, gameData, gameId, logsLocation))
            val game = Game(gameId, mapOf(player1, player2), logsLocation, mapOf(
                    "p1" to player1Controller,
                    "p2" to player2Controller,
                    "wonders" to wondersMode
            ))

            generator.popAll()
            try {
                game.mainLoop(initGameState, generator)
            } catch (e: Exception) {
                System.exit(1) // already logged by mainLoop; exit explicitly or the MCTS worker threads keep the JVM alive
            }
            System.exit(0)
        }

        @Throws(IOException::class)
        // From https://stackoverflow.com/a/326440
        private fun readFile(path: String, encoding: Charset): String {
            val encoded = Files.readAllBytes(Paths.get(path))
            return String(encoded, encoding)
        }

        private fun getPlayer(player: PlayerTurn, playerClass: String, gameData: GameData, gameId: String, logsPath: String): Player<GameState> {
            return when (playerClass) {
                "MCTS" -> MctsVictory(player, "MCTS", gameId, gameData, logsPath)
                "MCTS_Civilian" -> MctsCivilian(player, "MCTS_CIV", gameId, gameData, logsPath)
                "MCTS_Opportunist" -> MctsOpportunist(player, "MCTS_OPP", gameId, gameData, logsPath)
                "MCTS_Science" -> MctsScience(player, "MCTS_SCI", gameId, gameData, logsPath)
                "MCTS_Military" -> MctsMilitary(player, "MCTS_MIL", gameId, gameData, logsPath)
                "DDA" -> MctsDDA(player, "DDA(HS)", gameId, gameData, logsPath)
                "Random" -> RandomPlayer("Random", gameData)
                "Human" -> KeyboardPlayer(player, "Keyboard", gameId, gameData, logsPath)
                else -> throw Exception("Unknown player controller $playerClass")
            }
        }
    }
}