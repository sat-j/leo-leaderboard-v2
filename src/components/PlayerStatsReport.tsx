'use client';

import { PlayerAnalytics, PartnershipStat, OpponentStat } from '@/lib/playerAnalytics';

interface Props {
  analytics: PlayerAnalytics;
  isOverall: boolean;
}

function filterPartnerships(partnerships: PartnershipStat[], isOverall: boolean): PartnershipStat[] {
  if (!isOverall) {
    return partnerships;
  }
  const filtered = partnerships.filter(p => p.totalMatches >= 3);
  if (filtered.length < 3) {
    return partnerships;
  }
  return filtered;
}

export default function PlayerStatsReport({ analytics, isOverall }: Props) {
  const {
    playerName,
    totalMatches,
    wins,
    losses,
    winRate,
    overallAvgWinRate,
    partnerships,
    opponents,
  } = analytics;

  const winRateDiff = winRate - overallAvgWinRate;
  const winRateDiffStr =
    winRateDiff >= 0 ? `+${winRateDiff.toFixed(1)}%` : `${winRateDiff.toFixed(1)}%`;

  // Bunnies: opponents sorted by most wins
  const bunnies: OpponentStat[] = [...opponents]
    .filter(o => o.wins > 0)
    .sort((a, b) => b.wins - a.wins)
    .slice(0, 5);

  // Weaknesses: opponents sorted by most losses
  const weaknesses: OpponentStat[] = [...opponents]
    .filter(o => o.losses > 0)
    .sort((a, b) => b.losses - a.losses)
    .slice(0, 5);

  // Rivalries: on both lists
  const bunnyNames = new Set(bunnies.map(b => b.opponent));
  const weaknessNames = new Set(weaknesses.map(w => w.opponent));
  const rivalries = [...bunnyNames].filter(n => weaknessNames.has(n));

  // Apply partnership filtering based on overall vs weekly view
  const filteredPartnerships = filterPartnerships(partnerships, isOverall);

  // Best partners: positive records sorted by win rate then wins
  const bestPartners: PartnershipStat[] = filteredPartnerships
    .filter(p => p.wins > p.losses || (p.wins >= 2 && p.losses === 0))
    .slice(0, 5);

  // Worst partners: 0 wins with losses
  const worstPartners: PartnershipStat[] = [...filteredPartnerships]
    .filter(p => p.wins === 0 && p.losses > 0)
    .sort((a, b) => b.losses - a.losses)
    .slice(0, 5);

  // Summary
  let tier = 'solid performer';
  if (winRate >= 70) tier = 'top-tier player';
  else if (winRate >= 50) tier = 'strong performer';
  else if (winRate < 30) tier = 'developing player';

  const dreamPartner = bestPartners[0]?.partner;
  const topBunny = bunnies[0]?.opponent;
  const achilles = weaknesses[0]?.opponent;
  const avoidPartner = worstPartners[0]?.partner;

  const performanceTitle = isOverall ? '📊 Overall Performance' : '📊 Performance This Week';

  return (
    <div className="space-y-8">
      {/* Overall Performance */}
      <section className="bg-white rounded-xl shadow p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">{performanceTitle}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-electric-50 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-electric-600">{winRate.toFixed(1)}%</p>
            <p className="text-gray-600 text-sm mt-1">Win Rate</p>
          </div>
          <div className="bg-electric-50 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-electric-600">{totalMatches}</p>
            <p className="text-gray-600 text-sm mt-1">Total Matches</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-green-600">{wins}</p>
            <p className="text-gray-600 text-sm mt-1">Wins</p>
          </div>
          <div className="bg-red-50 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-red-500">{losses}</p>
            <p className="text-gray-600 text-sm mt-1">Losses</p>
          </div>
        </div>
        <p className="text-gray-600 text-sm">
          Season average: <strong>{overallAvgWinRate.toFixed(1)}%</strong> &mdash; {playerName} is{' '}
          <strong className={winRateDiff >= 0 ? 'text-green-600' : 'text-red-500'}>
            {winRateDiffStr}
          </strong>{' '}
          vs overall average.
        </p>
      </section>

      {/* Summary */}
      <section className="bg-gradient-to-r from-electric-800 to-electric-600 rounded-xl shadow p-6 text-white">
        <h2 className="text-2xl font-bold mb-3">🎯 Summary</h2>
        <p className="leading-relaxed text-electric-100">
          <strong className="text-white">{playerName}</strong> is a <strong className="text-coral-400">{tier}</strong> with a win rate of{' '}
          <strong className="text-coral-400">{winRate.toFixed(1)}%</strong> across {totalMatches} matches{!isOverall ? ' this week' : ''}.{' '}
          {dreamPartner && (
            <>🔥 Best played with <strong className="text-coral-400">{dreamPartner}</strong>. </>
          )}
          {topBunny && (
            <>🎯 Dominates <strong className="text-coral-400">{topBunny}</strong> most. </>
          )}
          {achilles && (
            <>⚠️ Achilles heel: <strong className="text-coral-400">{achilles}</strong>. </>
          )}
          {avoidPartner && (
            <>👀 Need to sync better with <strong className="text-coral-400">{avoidPartner}</strong>.</>
          )}
        </p>
      </section>

      {/* Strengths */}
      <section className="bg-white rounded-xl shadow p-6">
        <h2 className="text-2xl font-bold text-green-700 mb-1">💪 Strengths — Who He Dominates</h2>
        <p className="text-gray-500 text-sm mb-4">Biggest bunnies (opponents {playerName} beats most):</p>
        {bunnies.length === 0 ? (
          <p className="text-gray-500 italic">No dominant matchups yet.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 pr-4 text-gray-600 font-semibold">Opponent</th>
                    <th className="text-center py-2 text-gray-600 font-semibold">Wins Against</th>
                  </tr>
                </thead>
                <tbody>
                  {bunnies.map(b => (
                    <tr key={b.opponent} className="border-b border-gray-100 hover:bg-green-50">
                      <td className="py-2 pr-4 font-medium text-gray-800">{b.opponent}</td>
                      <td className="py-2 text-center text-green-700 font-bold">
                        {b.wins >= 10 ? '🎯 ' : ''}{b.wins}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {topBunny && (
              <p className="mt-3 text-gray-700 text-sm">
                🎯 Top victim: <strong>{topBunny}</strong> ({bunnies[0].wins} wins against them).
              </p>
            )}
          </>
        )}
      </section>

      {/* Weaknesses */}
      <section className="bg-white rounded-xl shadow p-6">
        <h2 className="text-2xl font-bold text-orange-600 mb-1">⚠️ Weaknesses — Who Troubles Him</h2>
        <p className="text-gray-500 text-sm mb-4">Opponents who give {playerName} the most trouble:</p>
        {weaknesses.length === 0 ? (
          <p className="text-gray-500 italic">No notable weaknesses yet.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 pr-4 text-gray-600 font-semibold">Opponent</th>
                    <th className="text-center py-2 text-gray-600 font-semibold">Losses Against</th>
                  </tr>
                </thead>
                <tbody>
                  {weaknesses.map(w => (
                    <tr key={w.opponent} className="border-b border-gray-100 hover:bg-orange-50">
                      <td className="py-2 pr-4 font-medium text-gray-800">{w.opponent}</td>
                      <td className="py-2 text-center text-red-600 font-bold">
                        {w.losses >= 4 ? '😭 ' : ''}{w.losses}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {achilles && (
              <p className="mt-3 text-gray-700 text-sm">
                😭 Kryptonite: <strong>{achilles}</strong> ({weaknesses[0].losses} losses against them).
              </p>
            )}
            {rivalries.length > 0 && (
              <p className="mt-2 text-gray-700 text-sm">
                ⚔️ Rivals (appears on both lists): <strong>{rivalries.join(', ')}</strong>
              </p>
            )}
          </>
        )}
      </section>

      {/* Best Partners */}
      <section className="bg-white rounded-xl shadow p-6">
        <h2 className="text-2xl font-bold text-blue-700 mb-4">👥 Best Playing Partners</h2>
        {bestPartners.length === 0 ? (
          <p className="text-gray-500 italic">Not enough data for best partners yet.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 pr-4 text-gray-600 font-semibold">Partner</th>
                    <th className="text-center py-2 pr-4 text-gray-600 font-semibold">W/L</th>
                    <th className="text-left py-2 text-gray-600 font-semibold">Verdict</th>
                  </tr>
                </thead>
                <tbody>
                  {bestPartners.map(p => (
                    <tr key={p.partner} className="border-b border-gray-100 hover:bg-blue-50">
                      <td className="py-2 pr-4 font-medium text-gray-800">{p.partner}</td>
                      <td className="py-2 pr-4 text-center text-gray-700 font-mono">
                        {p.wins}W / {p.losses}L
                      </td>
                      <td className="py-2 text-sm">{p.verdict}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {dreamPartner && (
              <p className="mt-3 text-gray-700 text-sm">
                🔥 Dream partner: <strong>{dreamPartner}</strong> — {bestPartners[0].wins}W/{bestPartners[0].losses}L together.
              </p>
            )}
          </>
        )}
      </section>

      {/* Worst Partners */}
      <section className="bg-white rounded-xl shadow p-6">
        <h2 className="text-2xl font-bold text-red-600 mb-4">❌ Worst Playing Partners</h2>
        {worstPartners.length === 0 ? (
          <p className="text-gray-500 italic">No notably poor partnerships yet.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 pr-4 text-gray-600 font-semibold">Partner</th>
                    <th className="text-center py-2 pr-4 text-gray-600 font-semibold">W/L</th>
                    <th className="text-left py-2 text-gray-600 font-semibold">Verdict</th>
                  </tr>
                </thead>
                <tbody>
                  {worstPartners.map(p => (
                    <tr key={p.partner} className="border-b border-gray-100 hover:bg-red-50">
                      <td className="py-2 pr-4 font-medium text-gray-800">{p.partner}</td>
                      <td className="py-2 pr-4 text-center text-gray-700 font-mono">
                        {p.wins}W / {p.losses}L
                      </td>
                      <td className="py-2 text-sm">{p.verdict}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {avoidPartner && (
              <p className="mt-3 text-gray-700 text-sm">
                👀 Need to sync better with <strong>{avoidPartner}</strong> — chemistry just isn&apos;t there ({worstPartners[0].losses} losses together).
              </p>
            )}
          </>
        )}
      </section>
    </div>
  );
}
