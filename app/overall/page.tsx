'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import PlayerStatsTable from '@/components/PlayerStatsTable';
import { PlayerOverallStat } from '@/types';

interface OverallData {
  overallStats: PlayerOverallStat[];
  totalPlayDates: number;
  totalMatches: number;
}

export default function OverallPage() {
  const [data, setData] = useState<OverallData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverallData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/public/leaderboard/overall');
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || 'Failed to fetch overall data');
      }

      setData(result.data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverallData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-electric-900 to-electric-700 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-coral-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading overall statistics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-electric-900 to-electric-700 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <div className="text-red-500 text-5xl mb-4">!</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Error Loading Data</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchOverallData}
            className="bg-electric-600 text-white px-6 py-2 rounded-lg hover:bg-electric-700 transition-colors"
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
    <main className="min-h-screen bg-gradient-to-b from-electric-900 to-electric-700">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">Overall Statistics</h1>
          <p className="text-electric-200">Cumulative player statistics across all processed play dates</p>
          <div className="mt-4 flex justify-center gap-4 text-electric-200 text-sm">
            <span>
              Total Play Dates:{' '}
              <strong className="text-coral-500" aria-label="Total play dates">
                {data.totalPlayDates}
              </strong>
            </span>
            <span>•</span>
            <span>
              Total Matches:{' '}
              <strong className="text-coral-500" aria-label="Total matches played">
                {data.totalMatches}
              </strong>
            </span>
          </div>
        </div>

        <div className="mb-6">
          <Link href="/" className="inline-flex items-center gap-2 text-white hover:text-coral-500 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            Back to Leaderboard
          </Link>
        </div>

        <PlayerStatsTable stats={data.overallStats} title="Overall Player Statistics" isOverall={true} />

        <div className="mt-12 text-center text-electric-200 text-sm">
          <p>Powered by TrueSkill Rating System</p>
        </div>
      </div>
    </main>
  );
}
