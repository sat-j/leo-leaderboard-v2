'use client';

import { Trophy, Users, Target } from 'lucide-react';
import { WeekStats } from '@/types';

interface StatsGridProps {
  weekStats: WeekStats;
}

export default function StatsGrid({ weekStats }: StatsGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {/* Top 3 Players of the Week */}
      <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
        <div className="flex items-center gap-3 mb-4">
          <Trophy className="w-6 h-6 text-coral-600" />
          <h3 className="text-lg font-semibold text-gray-800">Top Movers</h3>
        </div>
        <div className="space-y-3">
          {weekStats.topPlayers.length > 0 ? (
            weekStats.topPlayers.map((player, idx) => (
              <div key={player.playerName} className="flex justify-between items-center">
                <span className="font-medium text-gray-700">
                  {idx + 1}. {player.playerName}
                </span>
                <span className="text-coral-600 font-semibold">
                  +{player.ratingGain.toFixed(1)}
                </span>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-sm">No data available</p>
          )}
        </div>
      </div>

      {/* Top 3 Most Games Played */}
      <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
        <div className="flex items-center gap-3 mb-4">
          <Users className="w-6 h-6 text-electric-600" />
          <h3 className="text-lg font-semibold text-gray-800">Most Games Played</h3>
        </div>
        <div className="space-y-3">
          {weekStats.mostGamesPlayed.length > 0 ? (
            weekStats.mostGamesPlayed.map((player, idx) => (
              <div key={player.playerName} className="flex justify-between items-center">
                <span className="font-medium text-gray-700">
                  {idx + 1}. {player.playerName}
                </span>
                <span className="text-electric-600 font-semibold">
                  {player.gamesPlayed} games
                </span>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-sm">No data available</p>
          )}
        </div>
      </div>

      {/* Top 3 Win Percentage */}
      <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
        <div className="flex items-center gap-3 mb-4">
          <Target className="w-6 h-6 text-purple-500" />
          <h3 className="text-lg font-semibold text-gray-800">Best Win Rate</h3>
        </div>
        <div className="space-y-3">
          {weekStats.bestWinPercentage.length > 0 ? (
            weekStats.bestWinPercentage.map((player, idx) => (
              <div key={player.playerName} className="flex justify-between items-center">
                <span className="font-medium text-gray-700">
                  {idx + 1}. {player.playerName}
                </span>
                <span className="text-purple-600 font-semibold">
                  {player.winPercentage.toFixed(0)}%
                </span>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-sm">Min. 3 games required</p>
          )}
        </div>
      </div>
    </div>
  );
}
