package com.aigamelabs.swduel.actions

import com.aigamelabs.game.Action
import com.aigamelabs.game.PlayerTurn
import com.aigamelabs.utils.RandomWithTracker
import com.aigamelabs.swduel.*
import com.aigamelabs.swduel.enums.*
import io.vavr.collection.HashSet
import java.util.logging.Logger


class BuildWonder(playerTurn: PlayerTurn, val card: Card) : Action<GameState>(playerTurn) {

    override fun process(gameState: GameState, generator : RandomWithTracker, logger: Logger?): GameState {

        // Gather data
        val playerCity = gameState.getPlayerCity(player)
        val opponentCity = gameState.getPlayerCity(player.opponent())
        val cost = playerCity.canBuild(card, opponentCity) ?: throw Exception("Wonder not affordable")
        val playerCoins = playerCity.coins

        // Move card
        val updatedUnbuiltWonders = playerCity.unbuiltWonders.remove(card)
        val updatedWonders = playerCity.wonders.add(card)
        // "As soon as either player constructs the game's 7th Wonder, the last Wonder is returned to the box"
        val wasSeventh = updatedWonders.size() + opponentCity.wonders.size() >= 7
        val updatedPlayerCity = playerCity.update(wonders_ = updatedWonders,
                unbuiltWonders_ = if (wasSeventh) HashSet.empty() else updatedUnbuiltWonders,
                coins_ = playerCoins - cost)
        // Economy: "You gain the money spent by your opponent when they trade for resources"
        val updatedOpponentCity = (if (opponentCity.hasProgressToken(Enhancement.ECONOMY))
            opponentCity.addCoins(playerCity.tradingCost(card, opponentCity)) else opponentCity)
                .let { if (wasSeventh) it.update(unbuiltWonders_ = HashSet.empty()) else it }


        // A replay earned with the last card of an Age is lost; treating it as a normal turn also keeps
        // "the last active player" right for choosing who starts the next Age
        val hasExtraTurn = !gameState.cardStructure!!.isEmpty() && (gameState.getPlayerCity(player).hasProgressToken(Enhancement.THEOLOGY) ||
                setOf(
                        Wonders.PIRAEUS,
                        Wonders.THE_SPHINX,
                        Wonders.THE_APPIAN_WAY,
                        Wonders.THE_HANGING_GARDENS,
                        Wonders.THE_TEMPLE_OF_ARTEMIS
                ).contains(card.wonders))

        val updatedPlayer1City = if (player == PlayerTurn.PLAYER_1) updatedPlayerCity else updatedOpponentCity
        val updatedPlayer2City = if (player == PlayerTurn.PLAYER_2) updatedPlayerCity else updatedOpponentCity
        val updatedGameState = if (hasExtraTurn)
            gameState.update(player1City_ = updatedPlayer1City, player2City_ = updatedPlayer2City)
        else
            gameState.update(player1City_ = updatedPlayer1City, player2City_ = updatedPlayer2City,
                    nextPlayer_ = player.opponent())

        return processWonders(updatedGameState, generator, logger)
    }

    private fun processWonders(gameState: GameState, generator: RandomWithTracker, logger: Logger?): GameState {
        return when (card.wonders) {
            Wonders.THE_GREAT_LIBRARY -> {
                gameState.addSelectDiscardedProgressTokenDecision(player, generator)
            }

            Wonders.THE_MAUSOLEUM -> {
                return if (gameState.burnedCards.size() > 0) {
                    gameState.addSelectBurnedBuildingToBuildDecision(player)
                } else {
                    gameState.addMainTurnDecision(generator, logger)
                }
            }

            Wonders.THE_COLOSSUS -> {
                gameState.addMilitaryProgress(2, player)
                        .checkMilitarySupremacy()
                        .addMainTurnDecision(generator, logger)
            }

            Wonders.CIRCUS_MAXIMUS -> {
                val noBuildingsToBurn = gameState.getPlayerCity(player.opponent())
                        .getBurnableBuildings(CardColor.GRAY)
                        .isEmpty

                return if (noBuildingsToBurn)
                    gameState
                            .addMilitaryProgress(1, player)
                            .checkMilitarySupremacy()
                            .addMainTurnDecision(generator, logger)
                else
                    gameState
                            .addMilitaryProgress(1, player)
                            .checkMilitarySupremacy()
                            .addBurnOpponentBuildingDecision(player, CardColor.GRAY)
            }
            Wonders.THE_STATUE_OF_ZEUS -> {
                val noBuildingsToBurn = gameState.getPlayerCity(player.opponent())
                        .getBurnableBuildings(CardColor.BROWN)
                        .isEmpty

                return if (noBuildingsToBurn)
                    gameState
                            .addMilitaryProgress(1, player)
                            .checkMilitarySupremacy()
                            .addMainTurnDecision(generator, logger)
                else
                    gameState
                            .addMilitaryProgress(1, player)
                            .checkMilitarySupremacy()
                            .addBurnOpponentBuildingDecision(player, CardColor.BROWN)
            }
            Wonders.THE_APPIAN_WAY -> {
                val playerCity = gameState.getPlayerCity(player)
                val opponentCity = gameState.getPlayerCity(player.opponent())
                val updatedPlayerCity = playerCity.addCoins(card.coinsProduced) // Add player coins
                val updatedOpponentCity = opponentCity.removeCoins(3) // Remove opponent coins
                val updatedPlayer1City = if (player == PlayerTurn.PLAYER_1) updatedPlayerCity else updatedOpponentCity
                val updatedPlayer2City = if (player == PlayerTurn.PLAYER_2) updatedPlayerCity else updatedOpponentCity
                gameState.update(player1City_ = updatedPlayer1City, player2City_ = updatedPlayer2City)
                        .addMainTurnDecision(generator, logger)
            }
            Wonders.THE_TEMPLE_OF_ARTEMIS,
            Wonders.THE_HANGING_GARDENS -> {
                val playerCity = gameState.getPlayerCity(player)
                val opponentCity = gameState.getPlayerCity(player.opponent())
                val updatedPlayerCity = playerCity.addCoins(card.coinsProduced)
                val updatedPlayer1City = if (player == PlayerTurn.PLAYER_1) updatedPlayerCity else opponentCity
                val updatedPlayer2City = if (player == PlayerTurn.PLAYER_2) updatedPlayerCity else opponentCity
                gameState.update(player1City_ = updatedPlayer1City, player2City_ = updatedPlayer2City)
                        .addMainTurnDecision(generator, logger)
            }
            Wonders.THE_GREAT_LIGHTHOUSE,
            Wonders.THE_SPHINX,
            Wonders.THE_PYRAMIDS,
            Wonders.PIRAEUS -> gameState.addMainTurnDecision(generator, logger)
            else -> {
                throw Exception()
            }
        }
    }

    override fun toString(): String {
        return "Build wonder ${card.name}"
    }
}
