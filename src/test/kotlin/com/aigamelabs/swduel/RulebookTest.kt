package com.aigamelabs.swduel

import com.aigamelabs.game.PlayerTurn
import com.aigamelabs.game.PlayerTurn.PLAYER_1
import com.aigamelabs.game.PlayerTurn.PLAYER_2
import com.aigamelabs.swduel.actions.BurnForWonder
import com.aigamelabs.swduel.actions.ChooseProgressToken
import com.aigamelabs.swduel.enums.GameOutcome
import com.aigamelabs.swduel.enums.GamePhase
import com.aigamelabs.utils.Deck
import com.aigamelabs.utils.RandomWithTracker
import io.vavr.collection.HashSet
import io.vavr.collection.Queue
import io.vavr.collection.Vector
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

/** One check per rule that the engine once got wrong; page numbers refer to the 7 Wonders Duel rulebook. */
class RulebookTest {
    private val generator = RandomWithTracker(1, true)
    private fun card(name: String) = CardFactory.getByName(name)
    private fun city(coins: Int = 7, buildings: List<String> = emptyList(), tokens: List<String> = emptyList(),
                     wonders: List<String> = emptyList(), unbuilt: List<String> = emptyList()) =
            PlayerCity("test", coins, HashSet.ofAll(buildings.map(::card)), HashSet.ofAll(wonders.map(::card)),
                    HashSet.ofAll(tokens.map(::card)), HashSet.ofAll(unbuilt.map(::card)))

    /** An Age I game, P1 to move, with the given cities and nothing queued. */
    private fun game(p1: PlayerCity, p2: PlayerCity) = GameStateFactory.createNewGameStateWithRandomWonders(generator)
            .update(player1City_ = p1, player2City_ = p2, decisionQueue_ = Queue.empty(), nextPlayer_ = PLAYER_1)

    @Test fun `looting takes 2 coins entering the second zone and 5 entering the third (p12, p14)`() {
        val (first, board) = MilitaryBoard().addMilitaryPointsTo(3, PLAYER_1)
        val (second, _) = board.addMilitaryPointsTo(3, PLAYER_1)
        assertEquals(listOf(2, 5), listOf(first, second))
        assertEquals(7, MilitaryBoard().addMilitaryPointsTo(6, PLAYER_2).first, "crossing both zones at once loots both")
    }

    @Test fun `a city without enough coins loses all of them, never more (p14)`() {
        assertEquals(0, city(coins = 1).removeCoins(5).coins)
        val afterLooting = game(city(buildings = listOf("Stable")), city(coins = 1)).let {
            it.update(militaryBoard_ = MilitaryBoard().addMilitaryPointsTo(2, PLAYER_1).second)
                    .buildBuilding(PLAYER_1, card("Guard tower"), generator, null, false)
        }
        assertEquals(0, afterLooting.player2City.coins)
    }

    @Test fun `Masonry and Architecture waive 2 resources (p14)`() {
        assertEquals(2, city().canBuild(card("Baths"), city()))
        assertEquals(0, city(tokens = listOf("Masonry")).canBuild(card("Baths"), city()))
        assertEquals(8, city(coins = 20).canBuild(card("The Pyramids"), city()))
        assertEquals(4, city(coins = 20, tokens = listOf("Architecture")).canBuild(card("The Pyramids"), city()))
        assertEquals(2, city(tokens = listOf("Architecture")).canBuild(card("Baths"), city()), "Architecture is for wonders only")
    }

    @Test fun `Agriculture pays 6 coins when taken (p14)`() {
        val state = game(city(), city()).update(activeScienceDeck_ = Deck("tokens", Vector.of(Pair(Vector.of(card("Agriculture")), 0))))
        assertEquals(13, ChooseProgressToken(PLAYER_1, card("Agriculture")).process(state, generator, null).player1City.coins)
    }

    @Test fun `Lighthouse counts itself and Urbanism pays 4 coins for a chain build (p14, p15)`() {
        val build = { tokens: List<String> ->
            game(city(buildings = listOf("Tavern"), tokens = tokens), city())
                    .buildBuilding(PLAYER_1, card("Lighthouse"), generator, null, false).player1City.coins
        }
        assertEquals(7 + 2, build(emptyList()), "free through the Tavern's chain; 1 coin each for Tavern and Lighthouse")
        assertEquals(7 + 2 + 4, build(listOf("Urbanism")))
    }

    @Test fun `Economy collects what the opponent spends on trading, but not printed coin costs (p14)`() {
        val after = { name: String ->
            game(city(), city(tokens = listOf("Economy"))).buildBuilding(PLAYER_1, card(name), generator, null, false)
        }
        assertEquals(listOf(5, 9), after("Baths").let { listOf(it.player1City.coins, it.player2City.coins) })
        assertEquals(listOf(5, 7), after("Scriptorium").let { listOf(it.player1City.coins, it.player2City.coins) })
    }

    @Test fun `Shipowners Guild scores a single city for both colours (p16)`() {
        val brown = listOf("Lumber yard", "Clay pool", "Quarry")
        val gray = listOf("Glassworks", "Press")
        val points = { guild: List<String> ->
            game(city(buildings = brown + guild), city(buildings = gray)).calculateVictoryPoints(PLAYER_1)
        }
        assertEquals(3, points(listOf("Shipowners guild")) - points(emptyList()), "3 brown beats 2 gray; not 3 + 2")
    }

    @Test fun `a tie on points goes to the most civilian points, else it is shared (p13)`() {
        val winner = { p1: String, p2: String ->
            game(city(buildings = listOf(p1)), city(buildings = listOf(p2)))
                    .update(gamePhase_ = GamePhase.CIVILIAN_VICTORY).calculateWinner().first
        }
        assertEquals(GameOutcome.PLAYER_1_VICTORY, winner("Altar", "Academy")) // 3 blue points against 3 green
        assertEquals(GameOutcome.TIE, winner("Altar", "Theater"))
    }

    @Test fun `wonders are capped at 7 in total, not blocked by the opponent having 4 (p11)`() {
        val four = listOf("The Sphinx", "Piraeus", "The Colossus", "The Mausoleum")
        val canBuildWonder = { mine: List<String> ->
            game(city(coins = 50, wonders = mine, unbuilt = listOf("The Pyramids")), city(wonders = four))
                    .addMainTurnDecision(generator, null).decisionQueue.head().options.exists { it is BurnForWonder }
        }
        assertTrue(canBuildWonder(listOf("The Appian Way")), "5 built so far")
        assertFalse(canBuildWonder(listOf("The Appian Way", "Circus Maximus", "The Great Library")), "7 built already")
    }

    @Test fun `the Great Library offers 3 of the 5 tokens set aside (p17)`() {
        val decision = game(city(), city()).addSelectDiscardedProgressTokenDecision(PLAYER_1, generator).decisionQueue.head()
        assertEquals(3, decision.options.size())
    }
}
