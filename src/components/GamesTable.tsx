'use client';

import { useState } from 'react';
import { CheckCircle } from 'lucide-react';
import { Match } from '@/types';

interface GamesTableProps {
  matches: Match[];
}

export default function GamesTable({ matches }: GamesTableProps) {
  const [searchQuery, setSearchQuery] = useState('');

  if (matches.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Matches</h2>
        <p className="text-gray-500">No matches found for this play date.</p>
      </div>
    );
  }

  // Filter matches based on search query
  const filteredMatches = matches
    .map((match, index) => ({ match, originalIndex: index }))
    .filter(({ match }) => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return (
        match.player1.toLowerCase().includes(query) ||
        match.player2.toLowerCase().includes(query) ||
        match.player3.toLowerCase().includes(query) ||
        match.player4.toLowerCase().includes(query)
      );
    });

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Matches</h2>
        
        {/* Search Input */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <label className="text-sm font-medium text-gray-700">Search:</label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Player name..."
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-electric-500 w-full sm:w-48"
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                #
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Team 1
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Team 2
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Score
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredMatches.map(({ match, originalIndex }) => {
              const team1Won = match.score1 > match.score2;
              
              return (
                <tr key={originalIndex} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap text-sm text-gray-900">
                    {originalIndex + 1}
                  </td>
                  <td className={`px-1 py-3 text-xs ${team1Won ? 'font-semibold text-green-700' : 'text-gray-700'}`}>
                    <div className="flex flex-col">
                      <span>{match.player1} / </span>
                      <span>{match.player2}</span>
                    </div>
                  </td>
                  <td className={`px-1 py-3 text-xs ${!team1Won ? 'font-semibold text-green-700' : 'text-gray-700'}`}>
                    <div className="flex flex-col">
                      <span>{match.player3} / </span>
                      <span>{match.player4}</span>
                    </div>
                  </td>
                  <td className="px-1 py-3 whitespace-nowrap text-xs text-center">
                    <span className={team1Won ? 'font-bold text-green-700' : 'text-gray-600'}>{match.score1}</span>
                    <span className="text-gray-500"> - </span>
                    <span className={!team1Won ? 'font-bold text-green-700' : 'text-gray-600'}>{match.score2}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {filteredMatches.length === 0 && searchQuery.trim() && (
        <p className="text-center text-gray-500 py-4">No matches found for "{searchQuery}"</p>
      )}
    </div>
  );
}
