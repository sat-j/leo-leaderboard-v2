import type { PlayerLevel } from '@/types';

export function normalizePlayerLevel(level: string | null | undefined): PlayerLevel {
  const normalizedLevel = (level || 'INT').trim().toUpperCase();

  if (normalizedLevel === 'ADV' || normalizedLevel === 'PLUS' || normalizedLevel === 'INT') {
    return normalizedLevel;
  }

  if (normalizedLevel === 'BEG') {
    return 'INT';
  }

  return 'INT';
}
