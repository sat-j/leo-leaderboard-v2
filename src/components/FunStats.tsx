'use client';

import { Star, Heart, Swords } from 'lucide-react';
import { RockstarPlayer, PlayerPair } from '@/types';

interface FunStatsProps {
  rockstars: RockstarPlayer[];
  closeBuddies: PlayerPair[];
  rivalries: PlayerPair[];
}

export default function FunStats({ rockstars, closeBuddies, rivalries }: FunStatsProps) {
  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Fun Statistics</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Rockstars */}
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3 mb-4">
            <Star className="w-6 h-6 text-yellow-600" />
            <h3 className="text-lg font-semibold text-gray-800">🌟 Rockstars</h3>
          </div>
          <p className="text-sm text-gray-600 mb-3">Most Improved from Week 1</p>
          <div className="space-y-3">
            {rockstars.length > 0 ? (
              rockstars.map((player, idx) => (
                <div key={player.playerName} className="bg-white rounded p-3">
                  <div className="font-medium text-gray-800">{idx + 1}. {player.playerName}</div>
                  <div className="text-sm text-gray-600">
                    {player.week1Rating.toFixed(1)} → {player.currentRating.toFixed(1)}
                  </div>
                  <div className="text-sm font-semibold text-green-600">
                    +{player.improvement.toFixed(1)} points
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">No data available</p>
            )}
          </div>
        </div>

        {/* Close Buddies */}
        <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3 mb-4">
            <Heart className="w-6 h-6 text-pink-600" />
            <h3 className="text-lg font-semibold text-gray-800">👥 Close Buddies</h3>
          </div>
          <p className="text-sm text-gray-600 mb-3">Most Matches as Teammates</p>
          <div className="space-y-3">
            {closeBuddies.length > 0 ? (
              closeBuddies.map((pair, idx) => (
                <div key={`${pair.player1}-${pair.player2}`} className="bg-white rounded p-3">
                  <div className="font-medium text-gray-800">
                    {idx + 1}. {pair.player1} & {pair.player2}
                  </div>
                  <div className="text-sm text-pink-600 font-semibold">
                    {pair.count} matches together
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">No data available</p>
            )}
          </div>
        </div>

        {/* Rivalries */}
        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3 mb-4">
            <Swords className="w-6 h-6 text-red-600" />
            <h3 className="text-lg font-semibold text-gray-800">⚔️ Rivalries</h3>
          </div>
          <p className="text-sm text-gray-600 mb-3">Most Played Against</p>
          <div className="space-y-3">
            {rivalries.length > 0 ? (
              rivalries.map((pair, idx) => (
                <div key={`${pair.player1}-${pair.player2}`} className="bg-white rounded p-3">
                  <div className="font-medium text-gray-800">
                    {idx + 1}. {pair.player1} vs {pair.player2}
                  </div>
                  <div className="text-sm text-red-600 font-semibold">
                    {pair.count} matches
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">No data available</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
