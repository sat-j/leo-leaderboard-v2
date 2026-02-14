'use client';

import { useState, useEffect } from 'react';
import WeekNavigation from '@/components/WeekNavigation';
import StatsGrid from '@/components/StatsGrid';
import LevelLeaderboards from '@/components/LevelLeaderboards';
import FunStats from '@/components/FunStats';
import GamesTable from '@/components/GamesTable';
import { LeaderboardData } from '@/types';

export default function Home() {
  const [currentWeek, setCurrentWeek] = useState<number>(1);
  const [maxWeek, setMaxWeek] = useState<number>(1);
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboardData = async (week: number) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/leaderboard?week=${week}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch leaderboard data');
      }
      
      const result = await response.json();
      setData(result);
      setMaxWeek(result.maxWeek);
      setCurrentWeek(result.currentWeek);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboardData(currentWeek);
  }, []);

  const handleWeekChange = (newWeek: number) => {
    setCurrentWeek(newWeek);
    fetchLeaderboardData(newWeek);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Error Loading Data</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => fetchLeaderboardData(currentWeek)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">
            🏸 Badminton Club Leaderboard
          </h1>
          <p className="text-gray-600">Track your progress and compete with your club!</p>
        </div>

        {/* Week Navigation */}
        <WeekNavigation 
          currentWeek={currentWeek} 
          maxWeek={maxWeek} 
          onWeekChange={handleWeekChange} 
        />

        {/* Week Statistics */}
        <StatsGrid weekStats={data.weekStats} />

        {/* Level Leaderboards */}
        <LevelLeaderboards levelLeaderboards={data.levelLeaderboards} />

        {/* Fun Statistics */}
        <FunStats 
          rockstars={data.rockstars}
          closeBuddies={data.closeBuddies}
          rivalries={data.rivalries}
        />

        {/* Games Table */}
        <GamesTable matches={data.matches} />

        {/* Footer */}
        <div className="mt-12 text-center text-gray-500 text-sm">
          <p>Powered by TrueSkill Rating System</p>
        </div>
      </div>
    </main>
  );
}
