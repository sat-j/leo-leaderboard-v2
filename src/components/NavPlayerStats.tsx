'use client';

import { useState, useEffect } from 'react';
import PlayerDropdown from './PlayerDropdown';

export default function NavPlayerStats() {
  const [playerNames, setPlayerNames] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/player-stats/list')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data.playerNames)) {
          setPlayerNames(data.playerNames);
        }
      })
      .catch(() => {});
  }, []);

  return <PlayerDropdown playerNames={playerNames} />;
}
