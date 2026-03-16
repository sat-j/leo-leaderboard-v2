import { NextRequest, NextResponse } from 'next/server';
import { listRecentMatches } from '@/lib/repositories/matches';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limitParam = Number.parseInt(searchParams.get('limit') || '25', 10);
    const limit = Number.isNaN(limitParam) ? 25 : Math.min(Math.max(limitParam, 1), 100);
    const dateFilter = searchParams.get('date');
    const matches = await listRecentMatches(limit);
    const normalizedMatches = matches.map((match) => {
      const playDateRow = Array.isArray(match.play_dates) ? match.play_dates[0] : match.play_dates;
      const participants = [...(match.match_participants ?? [])].sort((left, right) => {
        if (left.team_number !== right.team_number) {
          return left.team_number - right.team_number;
        }
        return left.seat_number - right.seat_number;
      });

      return {
        id: match.id,
        playedAt: match.played_at,
        date: playDateRow?.play_date ?? null,
        score1: match.score1,
        score2: match.score2,
        status: match.status,
        team1: participants
          .filter((player) => player.team_number === 1)
          .map((player) => (Array.isArray(player.players) ? player.players[0] : player.players)?.display_name ?? 'Unknown'),
        team2: participants
          .filter((player) => player.team_number === 2)
          .map((player) => (Array.isArray(player.players) ? player.players[0] : player.players)?.display_name ?? 'Unknown'),
      };
    });

    const filteredMatches = dateFilter
      ? normalizedMatches.filter((match) => match.date === dateFilter)
      : normalizedMatches;

    return NextResponse.json({
      success: true,
      data: {
        matches: filteredMatches,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load recent matches';
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message,
        },
      },
      { status: 500 }
    );
  }
}
