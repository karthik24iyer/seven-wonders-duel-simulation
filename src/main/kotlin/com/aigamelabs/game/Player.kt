package com.aigamelabs.game

abstract class Player<T: AbstractGameState<T>>(
        var name: String,
        val gameData: GameData
) {
    abstract fun init()
    /**
     * Decide an action to undertake. The action is one of the options contained in the first decision in the decision
     * queue of the game state.
     */
    abstract fun decide(gameState: T) : Action<T>
    /** For players that evaluate their options: estimated value (0..1) of each option at the last decision. */
    open fun lastDecisionValues(): Map<String, Double>? = null
    /** Anything the player wants recorded next to its last decision, e.g. what it was aiming for. */
    open fun lastDecisionNote(): String? = null
    abstract fun finalize(gameState: T)
    abstract fun close()
}