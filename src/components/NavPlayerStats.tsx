'use client';

import { useState, useEffect } from 'react';
import PlayerDropdown from './PlayerDropdown';

export default function NavPlayerStats() {
  const [players, setPlayers] = useState<Array<{ displayName: string; slug: string }>>([]);

  useEffect(() => {
    fetch('/api/public/players')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data.data?.players)) {
          setPlayers(data.data.players.map((player: { displayName: string; slug: string }) => ({
            displayName: player.displayName,
            slug: player.slug,
          })));
        }
      })
      .catch(() => {});
  }, []);

  return <PlayerDropdown players={players} />;
}
