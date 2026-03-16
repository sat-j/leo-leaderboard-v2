'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PlayDateOption } from '@/types';

interface DateNavigationProps {
  selectedDate: string;
  playDates: PlayDateOption[];
  previousDate: string | null;
  nextDate: string | null;
  onDateChange: (date: string) => void;
}

export default function DateNavigation({
  selectedDate,
  playDates,
  previousDate,
  nextDate,
  onDateChange,
}: DateNavigationProps) {
  return (
    <div className="flex items-center justify-center gap-4 py-6">
      <button
        onClick={() => previousDate && onDateChange(previousDate)}
        disabled={!previousDate}
        className="p-2 rounded-full bg-white hover:bg-electric-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-md"
        aria-label="Previous play date"
      >
        <ChevronLeft className="w-6 h-6 text-electric-700" />
      </button>

      <select
        value={selectedDate}
        onChange={(event) => onDateChange(event.target.value)}
        className="px-6 py-3 text-xl font-bold bg-white text-electric-800 rounded-lg shadow-md hover:shadow-lg transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-coral-500"
      >
        {playDates.map((playDate) => (
          <option key={playDate.id} value={playDate.date}>
            {playDate.labelShort}
          </option>
        ))}
      </select>

      <button
        onClick={() => nextDate && onDateChange(nextDate)}
        disabled={!nextDate}
        className="p-2 rounded-full bg-white hover:bg-electric-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-md"
        aria-label="Next play date"
      >
        <ChevronRight className="w-6 h-6 text-electric-700" />
      </button>
    </div>
  );
}
