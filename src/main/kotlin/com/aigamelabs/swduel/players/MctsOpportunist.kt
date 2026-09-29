package com.aigamelabs.swduel.players

import com.aigamelabs.game.Action
import com.aigamelabs.game.GameData
import com.aigamelabs.game.PlayerTurn
import com.aigamelabs.mcts.ActionSelection
import com.aigamelabs.mcts.ActionSelector
import com.aigamelabs.mcts.MctsBasedBot
import com.aigamelabs.mcts.NodeScoreMapper
import com.aigamelabs.mcts.NodeScoreMapping
import com.aigamelabs.swduel.GameState
import com.aigamelabs.swduel.enums.GamePhase

/**
 * Plays to win like [MctsVictory], but also leans on the two supremacy tracks, and how hard depends on how they are
 * going: it probes both early, and by Age III either bullies on a track that is working or drops it entirely.
 *
 * Why this exists: playouts are random, and random play completes a science set about once in 400 games, so a pure
 * win/loss reward never learns what green cards are for.
 */
class MctsOpportunist(
        private val me: PlayerTurn,
        playerId: String,
        gameId: String,
        gameData: GameData,
        logFileName: String? = null,
        private val stance: OpportunistStance = OpportunistStance(me)
) : MctsBasedBot<GameState>(
        me,
        playerId,
        gameId,
        gameData,
        ActionSelection.get(ActionSelector.HIGHEST_SCORE),
        PlayerTurn.getPlayers(gameData.controllers.size)
                .map { Pair(it, NodeScoreMapping.get(NodeScoreMapper.IDENTITY)) }
                .toMap(),
        PlayerTurn.getPlayers(gameData.controllers.size)
                .map { Pair(it, stance.evaluatorFor(it)) }
                .toMap(),
        logFileName
) {
    override fun decide(gameState: GameState): Action<GameState> {
        stance.update(gameState) // the reward only sees the end of a playout; the stance is how the real position gets in
        return super.decide(gameState)
    }

    override fun lastDecisionNote(): String = stance.describe()
}

/** What the Opportunist cares about besides winning. Re-read from the real position before every move. */
class OpportunistStance(private val me: PlayerTurn) {
    /** Share of the reward given to the science race and to the military track; the rest is plain win/loss. */
    @Volatile private var weights = Pair(0.0, 0.0)

    // ponytail: hand-picked numbers, tuned by eye and not by search. The knob scales both weights;
    // if this bot earns its keep, fit the thresholds below against match results instead.
    private val aggression = java.lang.Double.parseDouble(System.getProperty("swduel.opportunist.aggression", "1.0"))

    private fun symbols(state: GameState, player: PlayerTurn) = state.countScienceSymbols(player)
    private fun pawnAdvantage(state: GameState) =
            state.militaryBoard.conflictPawnPosition * (if (me == PlayerTurn.PLAYER_1) 1 else -1)

    fun update(state: GameState) {
        // 0 = this track is going nowhere, 1 = it is a live threat. Entering Age III with fewer than 3 symbols cannot
        // reach 6 (Age III only offers 2 new ones); +5 on the pawn is two Age III military cards from the capital.
        val scienceGoing = ((symbols(state, me) - 2) / 2.0).coerceIn(0.0, 1.0)
        val militaryGoing = ((pawnAdvantage(state) - 1) / 4.0).coerceIn(0.0, 1.0)
        val weight = { going: Double ->
            aggression * when (state.gamePhase) {
                GamePhase.THIRD_AGE -> 0.4 * going          // all or nothing: bully, or stop wasting turns on it
                GamePhase.SECOND_AGE -> 0.1 + 0.2 * going   // lean toward what is working
                else -> 0.2                                  // probe both
            }
        }
        val science = weight(scienceGoing)
        val military = weight(militaryGoing)
        val scale = Math.min(1.0, 0.5 / Math.max(science + military, 1e-9)) // winning always keeps at least half
        weights = Pair(science * scale, military * scale)
    }

    /** Half linear, half squared, sign kept: the 5th symbol (or 8th pawn step) is worth far more than the 1st. */
    private fun curve(x: Double) = (x + x * Math.abs(x)) / 2

    private fun evaluate(end: GameState, victory: (GameState) -> Double): Double {
        val (science, military) = weights
        val scienceLead = curve(symbols(end, me) / 6.0) - curve(symbols(end, me.opponentOf()) / 6.0)
        val militaryLead = curve(pawnAdvantage(end).coerceIn(-9, 9) / 9.0)
        return (1 - science - military) * victory(end) +
                science * (0.5 + scienceLead / 2) +
                military * (0.5 + militaryLead / 2)
    }

    /** Zero-sum: the opponent is modelled as wanting exactly the opposite, so blocking is valued like advancing. */
    fun evaluatorFor(player: PlayerTurn): (GameState) -> Double {
        val victory = StateEvaluation.getVictoryEvaluator(me)
        return if (player == me) { end -> evaluate(end, victory) } else { end -> 1 - evaluate(end, victory) }
    }

    fun describe(): String {
        val (science, military) = weights
        val parts = listOf(Pair("science", science), Pair("military", military))
                .filter { it.second >= 0.05 }
                .map { "${it.first} ${Math.round(it.second * 100)}%" }
        return if (parts.isEmpty()) "Stance: just playing to win" else "Stance: leaning on " + parts.joinToString(" and ")
    }

    private fun PlayerTurn.opponentOf() = if (this == PlayerTurn.PLAYER_1) PlayerTurn.PLAYER_2 else PlayerTurn.PLAYER_1
}
