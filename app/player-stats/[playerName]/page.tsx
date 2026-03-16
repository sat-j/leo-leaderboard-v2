'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import PlayerStatsReport from '@/components/PlayerStatsReport';
import { PlayerAnalytics } from '@/lib/playerAnalytics';
import { PlayDateOption } from '@/types';

interface ApiResponse {
  analytics: PlayerAnalytics;
  playDates: PlayDateOption[];
  selectedDate: string | null;
  player: {
    slug: string;
    displayName: string;
  };
}

export default function PlayerStatsPage() {
  const params = useParams();
  const playerSlug = decodeURIComponent(params.playerName as string);

  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const url = selectedDate
      ? `/api/public/players/${encodeURIComponent(playerSlug)}/stats?date=${selectedDate}`
      : `/api/public/players/${encodeURIComponent(playerSlug)}/stats`;

    fetch(url)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok || !body.success) {
          throw new Error(body.error?.message || 'Failed to load player stats');
        }
        return body.data;
      })
      .then((nextData: ApiResponse) => {
        setData(nextData);
        setSelectedDate(nextData.selectedDate);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Unknown error'))
      .finally(() => setLoading(false));
  }, [playerSlug, selectedDate]);

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
          <div className="text-red-500 text-5xl mb-4">!</div>
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

  if (!data) {
    return null;
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-electric-900 to-electric-700">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-6">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">{data.player.displayName}</h1>
          <p className="text-electric-200">Detailed player statistics and analysis</p>
        </div>

        <div className="flex justify-center mb-6">
          <div className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3">
            <label htmlFor="date-filter" className="text-white font-semibold text-sm">
              Filter by date:
            </label>
            <select
              id="date-filter"
              value={selectedDate ?? ''}
              onChange={(event) => setSelectedDate(event.target.value === '' ? null : event.target.value)}
              className="bg-electric-800 text-white border border-electric-500 rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-coral-500 cursor-pointer"
            >
              <option value="">Overall</option>
              {[...data.playDates].reverse().map((playDate) => (
                <option key={playDate.id} value={playDate.date}>
                  {playDate.labelShort}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-6">
          <Link href="/" className="inline-flex items-center gap-2 text-white hover:text-coral-500 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            Back to Leaderboard
          </Link>
        </div>

        <PlayerStatsReport analytics={data.analytics} isOverall={selectedDate === null} />

        <div className="mt-12 text-center text-electric-200 text-sm">
          <p>Powered by TrueSkill Rating System</p>
        </div>
      </div>
    </main>
  );
}
