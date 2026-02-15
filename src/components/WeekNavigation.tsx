'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

interface WeekNavigationProps {
  currentWeek: number;
  maxWeek: number;
  onWeekChange: (week: number) => void;
}

export default function WeekNavigation({ currentWeek, maxWeek, onWeekChange }: WeekNavigationProps) {
  const canGoPrevious = currentWeek > 1;
  const canGoNext = currentWeek < maxWeek;

  return (
    <div className="flex items-center justify-center gap-6 py-6">
      <button
        onClick={() => onWeekChange(currentWeek - 1)}
        disabled={!canGoPrevious}
        className="p-2 rounded-full bg-white hover:bg-electric-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-md"
        aria-label="Previous week"
      >
        <ChevronLeft className="w-6 h-6 text-electric-700" />
      </button>
      
      <select
        value={currentWeek}
        onChange={(e) => onWeekChange(Number(e.target.value))}
        className="px-6 py-3 text-xl font-bold bg-white text-electric-800 rounded-lg shadow-md hover:shadow-lg transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-coral-500"
      >
        {Array.from({ length: maxWeek }, (_, i) => i + 1).map((week) => (
          <option key={week} value={week}>
            Week {week}
          </option>
        ))}
      </select>
      
      <button
        onClick={() => onWeekChange(currentWeek + 1)}
        disabled={!canGoNext}
        className="p-2 rounded-full bg-white hover:bg-electric-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-md"
        aria-label="Next week"
      >
        <ChevronRight className="w-6 h-6 text-electric-700" />
      </button>
    </div>
  );
}
