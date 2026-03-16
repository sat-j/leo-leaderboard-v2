'use client';

import { PlayerRating, PlayerLevel } from '@/types';

interface LevelLeaderboardsProps {
  levelLeaderboards: {
    [key in PlayerLevel]?: PlayerRating[];
  };
}

const LEVEL_COLORS = {
  ADV: 'border-yellow-400 bg-yellow-50',
  INT: 'border-gray-400 bg-gray-50',
  PLUS: 'border-orange-400 bg-orange-50'
};

const LEVEL_NAMES = {
  ADV: 'Advanced',
  INT: 'Intermediate',
  PLUS: 'Plus'
};

function getRatingGainColorClass(ratingGain: number | undefined): string {
  if (ratingGain === undefined) return 'text-gray-600';
  if (ratingGain > 0) return 'text-green-600';
  if (ratingGain < 0) return 'text-red-600';
  return 'text-gray-600';
}

export default function LevelLeaderboards({ levelLeaderboards }: LevelLeaderboardsProps) {
  const levels: PlayerLevel[] = ['ADV', 'INT', 'PLUS'];

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Level Leaderboards</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {levels.map(level => {
          const players = levelLeaderboards[level] || [];
          
          return (
            <div 
              key={level} 
              className={`bg-white rounded-lg shadow-md p-6 border-t-4 ${LEVEL_COLORS[level]}`}
            >
              <h3 className="text-xl font-semibold text-gray-800 mb-4">
                Top 5 {LEVEL_NAMES[level]}
              </h3>
              <div className="space-y-3">
                {players.length > 0 ? (
                  players.map((player, idx) => (
                    <div key={player.playerName} className="flex justify-between items-center">
                      <span className="font-medium text-gray-700">
                        {idx + 1}. {player.playerName}
                      </span>
                      <span className={`font-semibold ${getRatingGainColorClass(player.ratingGain)}`}>
                        {player.ratingGain !== undefined 
                          ? `${player.ratingGain >= 0 ? '+' : ''}${player.ratingGain.toFixed(1)}`
                          : player.mu.toFixed(1)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">No players in this level</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
