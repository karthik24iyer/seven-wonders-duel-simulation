package com.aigamelabs.swduel

import com.aigamelabs.game.PlayerTurn.PLAYER_1
import com.aigamelabs.game.PlayerTurn.PLAYER_2
import com.aigamelabs.swduel.enums.GamePhase
import com.aigamelabs.swduel.players.OpportunistStance
import com.aigamelabs.utils.RandomWithTracker
import io.vavr.collection.HashSet
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class OpportunistStanceTest {
    private val fourSymbols = listOf("Pharmacist", "Scriptorium", "Workshop", "Apothecary")

    private fun state(phase: GamePhase, greens: List<String> = emptyList(), pawn: Int = 0): GameState {
        // 90 coins = a 30-point lead: P1 wins every end state below, so value differences come from the tracks alone
        val city = PlayerCity("test", 90, HashSet.ofAll(greens.map(CardFactory::getByName)), HashSet.empty(), HashSet.empty(), HashSet.empty())
        return GameStateFactory.createNewGameStateWithRandomWonders(RandomWithTracker(1, true)).update(
                player1City_ = city, gamePhase_ = phase,
                militaryBoard_ = MilitaryBoard().addMilitaryPointsTo(Math.abs(pawn), if (pawn >= 0) PLAYER_1 else PLAYER_2).second)
    }
    private fun stanceAt(state: GameState) = OpportunistStance(PLAYER_1).also { it.update(state) }

    @Test fun `probes both tracks early, then commits or quits in Age III`() {
        assertEquals("Stance: leaning on science 20% and military 20%", stanceAt(state(GamePhase.FIRST_AGE)).describe())
        assertEquals("Stance: just playing to win", stanceAt(state(GamePhase.THIRD_AGE)).describe())
        assertEquals("Stance: leaning on science 40%", stanceAt(state(GamePhase.THIRD_AGE, fourSymbols)).describe())
        assertEquals("Stance: leaning on military 40%", stanceAt(state(GamePhase.THIRD_AGE, pawn = 5)).describe())
        assertEquals("Stance: leaning on science 25% and military 25%", stanceAt(state(GamePhase.THIRD_AGE, fourSymbols, 5)).describe(),
                "winning always keeps at least half of the reward")
    }

    @Test fun `is zero-sum, and later steps on a track are worth more than earlier ones`() {
        val stance = stanceAt(state(GamePhase.THIRD_AGE, fourSymbols, 5))
        val mine = stance.evaluatorFor(PLAYER_1); val theirs = stance.evaluatorFor(PLAYER_2)
        val end = { greens: List<String>, pawn: Int -> state(GamePhase.CIVILIAN_VICTORY, greens, pawn) }
        assertEquals(1.0, mine(end(fourSymbols, 3)) + theirs(end(fourSymbols, 3)), 1e-9)
        val value = { n: Int -> mine(end(fourSymbols.take(n), 0)) }
        assertTrue(value(4) - value(3) > value(1) - value(0), "the 4th symbol should be worth more than the 1st")
        assertTrue(mine(end(emptyList(), 8)) - mine(end(emptyList(), 7)) > mine(end(emptyList(), 1)) - mine(end(emptyList(), 0)))
    }
}
