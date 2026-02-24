'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import PlayerStatsReport from '@/components/PlayerStatsReport';
import { PlayerAnalytics } from '@/lib/playerAnalytics';

interface ApiResponse {
  analytics: PlayerAnalytics;
  playerNames: string[];
}

export default function PlayerStatsPage() {
  const params = useParams();
  const playerName = decodeURIComponent(params.playerName as string);

  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    fetch(`/api/player-stats/${encodeURIComponent(playerName)}`)
      .then(async res => {
        if (!res.ok) {
          const body = await res.json();
          throw new Error(body.error || 'Failed to load player stats');
        }
        return res.json();
      })
      .then(setData)
      .catch(err => setError(err instanceof Error ? err.message : 'Unknown error'))
      .finally(() => setLoading(false));
  }, [playerName]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-electric-900 to-electric-700 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-coral-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading player statistics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-electric-900 to-electric-700 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Error Loading Data</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link
            href="/"
            className="bg-electric-600 text-white px-6 py-2 rounded-lg hover:bg-electric-700 transition-colors inline-block"
          >
            Back to Leaderboard
          </Link>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <main className="min-h-screen bg-gradient-to-b from-electric-900 to-electric-700">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
            🏸 {playerName}
          </h1>
          <p className="text-electric-200">Detailed player statistics &amp; analysis</p>
        </div>

        {/* Back link */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-white hover:text-coral-500 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Weekly Leaderboard
          </Link>
        </div>

        <PlayerStatsReport analytics={data.analytics} />

        <div className="mt-12 text-center text-electric-200 text-sm">
          <p>Powered by TrueSkill Rating System</p>
        </div>
      </div>
    </main>
  );
}
