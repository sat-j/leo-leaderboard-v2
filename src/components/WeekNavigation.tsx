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
        className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        aria-label="Previous week"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      
      <div className="text-2xl font-bold text-gray-800">
        Week {currentWeek}
      </div>
      
      <button
        onClick={() => onWeekChange(currentWeek + 1)}
        disabled={!canGoNext}
        className="p-2 rounded-full hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        aria-label="Next week"
      >
        <ChevronRight className="w-6 h-6" />
      </button>
    </div>
  );
}
