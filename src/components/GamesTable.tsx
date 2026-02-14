'use client';

import { CheckCircle, XCircle } from 'lucide-react';
import { Match } from '@/types';

interface GamesTableProps {
  matches: Match[];
}

export default function GamesTable({ matches }: GamesTableProps) {
  if (matches.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Matches</h2>
        <p className="text-gray-500">No matches found for this week.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Matches</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Match #
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Team 1
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Score
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Team 2
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Score
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Winner
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {matches.map((match, idx) => {
              const team1Won = match.score1 > match.score2;
              
              return (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {idx + 1}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${team1Won ? 'font-semibold text-green-700' : 'text-gray-700'}`}>
                    {match.player1} & {match.player2}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-center ${team1Won ? 'font-bold text-green-700' : 'text-gray-600'}`}>
                    {match.score1}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${!team1Won ? 'font-semibold text-green-700' : 'text-gray-700'}`}>
                    {match.player3} & {match.player4}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm text-center ${!team1Won ? 'font-bold text-green-700' : 'text-gray-600'}`}>
                    {match.score2}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                    {team1Won ? (
                      <CheckCircle className="w-5 h-5 text-green-600 mx-auto" />
                    ) : (
                      <CheckCircle className="w-5 h-5 text-green-600 mx-auto" />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
