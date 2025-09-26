
import React from 'react';

interface RulesScreenProps {
    onBack: () => void;
}

const RulesScreen: React.FC<RulesScreenProps> = ({ onBack }) => {
    return (
        <div className="w-full min-h-screen bg-brand-bg text-brand-text p-8 flex flex-col items-center">
            <div className="w-full max-w-4xl">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-5xl font-serif font-bold text-brand-primary">Game Rules</h1>
                    <button onClick={onBack} className="px-6 py-2 bg-brand-surface text-brand-text font-bold rounded-lg hover:bg-brand-card transition-colors">
                        Back to Title
                    </button>
                </div>
                <div className="bg-brand-surface/50 p-6 rounded-lg space-y-6">
                    <div>
                      <h2 className="text-2xl font-serif text-brand-secondary mb-2">Objective</h2>
                      <p>Reduce your opponent's points from 20 to 0. You lose if your points drop to 0 or below at the end of a round or from a card effect.</p>
                    </div>
                    <div>
                      <h2 className="text-2xl font-serif text-brand-secondary mb-2">The Round</h2>
                      <p>The game is a mix of Texas Hold'em poker and a trading card game. Each round, both players ante 1 point into the pot. You are dealt two secret 'hole cards' (always Unit cards with poker values) and a hand of five non-unit cards.</p>
                      <p className="mt-2">Betting occurs over four streets: Pre-Flop, Flop (3 community cards), Turn (1 card), and River (1 card). The player with the best 5-card poker hand at the Showdown wins the pot.</p>
                    </div>

                    <div>
                      <h2 className="text-2xl font-serif text-brand-secondary mb-2">Mana & Actions</h2>
                       <p>On your turn, you gain 1 Mana. You can spend Mana to play powerful Event, Artifact, or Location cards from your hand to disrupt your opponent or gain an advantage. These are your 'magic' actions.</p>
                       <p className="mt-2">You can also perform standard poker actions like Check, Bet, Call, Raise, or Fold. Playing a card or performing a betting action (except for folding) typically ends your turn.</p>
                    </div>
                     <div>
                      <h2 className="text-2xl font-serif text-brand-secondary mb-2">Keywords</h2>
                      <div className="space-y-3 text-sm max-h-60 overflow-y-auto pr-2">
                        <p><strong className="text-brand-accent">Wager:</strong> A high-risk, high-reward effect. These abilities often have game-changing outcomes but come with a steep penalty for failure. Note: Effects that set a player's points directly (e.g., 'your points are set to 1') bypass defensive abilities like Bulwark.</p>
                        <p><strong className="text-brand-accent">Cascade:</strong> Reveal the top cards of your deck and play the first valid, cheaper card for free.</p>
                        <p><strong className="text-brand-accent">Chrono:</strong> An effect that triggers at the start of your turn for a set number of turns.</p>
                        <p><strong className="text-brand-accent">Trap:</strong> A hidden card that triggers automatically when a specific condition is met by your opponent.</p>
                        <p><strong className="text-brand-accent">Bulwark:</strong> A defensive ability that reduces the impact of an opponent's numeric effects (like point or mana loss) by 1. Also provides mana when you are behind on points.</p>
                        <p><strong className="text-brand-accent">Intimidate:</strong> An aggressive ability that makes it cost 1 extra mana for your opponent to call your bets.</p>
                        <p><strong className="text-brand-accent">Overload:</strong> Pay a much higher mana cost to unleash a devastatingly powerful version of a card's effect.</p>
                        <p><strong className="text-brand-accent">Last Stand:</strong> A comeback mechanic for units, allowing you to pay mana to boost their rank at showdown if your points are low.</p>
                        <p><strong className="text-brand-accent">Flux:</strong> Provides immunity to certain effects and grants bonuses based on the size of the pot.</p>
                        <p><strong className="text-brand-accent">Synergy:</strong> Grants a bonus at the start of the round if your two hole cards share a suit or rank.</p>
                        <p><strong className="text-brand-accent">Peek:</strong> Pay mana to look at the top card of the community card deck before it's revealed.</p>
                      </div>
                    </div>
                </div>
            </div>
        </div>
    )
};
export default RulesScreen;
