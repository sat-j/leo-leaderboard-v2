'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface PlayerDropdownProps {
  playerNames: string[];
}

export default function PlayerDropdown({ playerNames }: PlayerDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = playerNames.filter(name =>
    name.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSelect(name: string) {
    setOpen(false);
    setSearch('');
    router.push(`/player-stats/${encodeURIComponent(name)}`);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen(prev => !prev)}
        className="text-white hover:text-coral-400 transition-colors px-3 py-2 whitespace-nowrap"
      >
        Player Stats
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-56 bg-electric-800 border border-electric-600 rounded-lg shadow-lg z-50">
          <div className="p-2">
            <input
              autoFocus
              type="text"
              placeholder="Search player..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full px-3 py-1.5 rounded bg-electric-700 text-white placeholder-electric-300 text-sm border border-electric-500 focus:outline-none focus:border-coral-500"
            />
          </div>
          <ul className="max-h-60 overflow-y-auto">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-electric-300 text-sm">No players found</li>
            ) : (
              filtered.map(name => (
                <li key={name}>
                  <button
                    onClick={() => handleSelect(name)}
                    className="w-full text-left px-3 py-2 text-white hover:bg-electric-600 hover:text-coral-400 transition-colors text-sm"
                  >
                    {name}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
