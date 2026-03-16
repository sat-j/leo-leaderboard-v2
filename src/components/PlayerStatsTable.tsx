'use client';

import { useState, useMemo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { PlayerWeekStat, PlayerOverallStat, PlayerLevel } from '@/types';

type SortField = 'playerName' | 'level' | 'skillRating' | 'totalMatches' | 'matchesWon' | 'winRate' | 'totalPointsScored' | 'pointsDifference' | 'ratingChange' | 'currentRating' | 'totalRatingChange' | 'weeksPlayed';
type SortOrder = 'asc' | 'desc';

interface PlayerStatsTableProps {
  stats: PlayerWeekStat[] | PlayerOverallStat[];
  title: string;
  isOverall?: boolean;
}

export default function PlayerStatsTable({ stats, title, isOverall = false }: PlayerStatsTableProps) {
  const [sortField, setSortField] = useState<SortField>(isOverall ? 'currentRating' : 'skillRating');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [levelFilter, setLevelFilter] = useState<PlayerLevel | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const filteredAndSortedStats = useMemo(() => {
    let filtered = [...stats];
    
    // Apply level filter
    if (levelFilter !== 'ALL') {
      filtered = filtered.filter(stat => stat.level === levelFilter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(stat => 
        stat.playerName.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal: string | number = a[sortField as keyof typeof a] as string | number;
      let bVal: string | number = b[sortField as keyof typeof b] as string | number;
      
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal as string).toLowerCase();
      }
      
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [stats, sortField, sortOrder, levelFilter, searchQuery]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 ml-1 text-gray-400" />;
    }
    return sortOrder === 'asc' ? 
      <ArrowUp className="w-4 h-4 ml-1 text-electric-600" /> : 
      <ArrowDown className="w-4 h-4 ml-1 text-electric-600" />;
  };

  const formatRatingChange = (change: number) => {
    if (change === 0) return <span className="text-gray-500">0.0</span>;
    const prefix = change > 0 ? '+' : '';
    const color = change > 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold';
    return <span className={color}>{prefix}{change.toFixed(1)}</span>;
  };

  if (stats.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">{title}</h2>
        <p className="text-gray-500">No player statistics available.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
        <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
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

          {/* Level Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Filter by Level:</label>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value as PlayerLevel | 'ALL')}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-electric-500"
            >
              <option value="ALL">All Levels</option>
              <option value="ADV">ADV</option>
              <option value="PLUS">PLUS</option>
              <option value="INT">INT</option>
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th 
                onClick={() => handleSort('playerName')}
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                <div className="flex items-center">
                  Player Name
                  <SortIcon field="playerName" />
                </div>
              </th>
              <th 
                onClick={() => handleSort('level')}
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                <div className="flex items-center">
                  Level
                  <SortIcon field="level" />
                </div>
              </th>
              <th 
                onClick={() => handleSort(isOverall ? 'currentRating' : 'skillRating')}
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                <div className="flex items-center">
                  {isOverall ? 'Current Rating' : 'Skill Rating'}
                  <SortIcon field={isOverall ? 'currentRating' : 'skillRating'} />
                </div>
              </th>
              <th 
                onClick={() => handleSort(isOverall ? 'totalRatingChange' : 'ratingChange')}
                className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                <div className="flex items-center justify-center">
                  Rating Change
                  <SortIcon field={isOverall ? 'totalRatingChange' : 'ratingChange'} />
                </div>
              </th>
              <th 
                onClick={() => handleSort('totalMatches')}
                className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                <div className="flex items-center justify-center">
                  Total Matches
                  <SortIcon field="totalMatches" />
                </div>
              </th>
              <th 
                onClick={() => handleSort('matchesWon')}
                className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                <div className="flex items-center justify-center">
                  Matches Won
                  <SortIcon field="matchesWon" />
                </div>
              </th>
              <th 
                onClick={() => handleSort('winRate')}
                className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                <div className="flex items-center justify-center">
                  Win Rate
                  <SortIcon field="winRate" />
                </div>
              </th>
              <th 
                onClick={() => handleSort('totalPointsScored')}
                className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                <div className="flex items-center justify-center">
                  Points Scored
                  <SortIcon field="totalPointsScored" />
                </div>
              </th>
              <th 
                onClick={() => handleSort('pointsDifference')}
                className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              >
                <div className="flex items-center justify-center">
                  Points Diff
                  <SortIcon field="pointsDifference" />
                </div>
              </th>
              {isOverall && (
                <th 
                  onClick={() => handleSort('weeksPlayed')}
                  className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                >
                  <div className="flex items-center justify-center">
                    Weeks Played
                    <SortIcon field="weeksPlayed" />
                  </div>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredAndSortedStats.map((stat, idx) => {
              const isWeekStat = 'skillRating' in stat;
              const rating = isWeekStat ? stat.skillRating : (stat as PlayerOverallStat).currentRating;
              const ratingChange = isWeekStat ? stat.ratingChange : (stat as PlayerOverallStat).totalRatingChange;
              
              return (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                    {stat.playerName}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      stat.level === 'ADV' ? 'bg-purple-100 text-purple-800' :
                      stat.level === 'PLUS' ? 'bg-blue-100 text-blue-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {stat.level}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-semibold">
                    {rating.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                    {formatRatingChange(ratingChange)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-gray-700">
                    {stat.totalMatches}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-gray-700">
                    {stat.matchesWon}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-gray-700">
                    {stat.winRate.toFixed(1)}%
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-gray-700">
                    {stat.totalPointsScored}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-gray-700">
                    {stat.pointsDifference > 0 ? '+' : ''}{stat.pointsDifference}
                  </td>
                  {isOverall && (
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center text-gray-700">
                      {(stat as PlayerOverallStat).weeksPlayed}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {filteredAndSortedStats.length === 0 && levelFilter !== 'ALL' && (
        <p className="text-center text-gray-500 py-4">No players found for level {levelFilter}</p>
      )}
    </div>
  );
}
