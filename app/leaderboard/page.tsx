'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../utils/supabase';
import { useRouter } from 'next/navigation';
import PlayerAvatar from '../components/PlayerAvatar';

interface RatingSummary {
  score: number;
}

interface Player {
  id: string;
  username: string;
  main_game: string;
  avatar_url: string | null;
  avatar_preset: string | null;
  avg_score: number | null;
  total_ratings: number;
  wins: number;
  losses: number;
}

export default function LeaderboardPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, main_game, avatar_url, avatar_preset, ratings!rated_id (score)')
      .limit(20); 

    if (profiles) {
      const playersWithStats: Player[] = [];

      for (const player of profiles) {
        const ratings = (player.ratings as RatingSummary[] | null) || [];
        const total_ratings = ratings.length;
        const avg_score = total_ratings > 0
          ? (ratings.reduce((sum: number, r: RatingSummary) => sum + r.score, 0) / total_ratings).toFixed(1)
          : null;

        // Fetch their W/L Record
        const { data: stats } = await supabase.rpc('get_player_stats', { p_user_id: player.id });
        const wins = stats && stats.length > 0 ? stats[0].wins : 0;
        const losses = stats && stats.length > 0 ? stats[0].losses : 0;

        playersWithStats.push({
          id: player.id,
          username: player.username,
          main_game: player.main_game,
          avatar_url: player.avatar_url,
          avatar_preset: player.avatar_preset,
          avg_score: avg_score ? parseFloat(avg_score) : null,
          total_ratings,
          wins,
          losses
        });
      }

      // Sort by Wins (descending), then by Trust Score (descending)
      playersWithStats.sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        return (b.avg_score || 0) - (a.avg_score || 0);
      });

      setPlayers(playersWithStats.slice(0, 10));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchLeaderboard();
  }, [fetchLeaderboard]);

  return (
    <main className="min-h-screen pb-24">
      <header className="fixed top-0 w-full z-50 glass-panel border-b border-green-900/50">
        <div className="max-w-md mx-auto p-4 flex justify-between items-center">
          <h1 className="text-xl font-black neon-text-green">MCHEZO<span className="text-white">PASS</span></h1>
          <button onClick={() => router.push('/')} className="text-xs bg-gray-800 hover:bg-gray-700 px-3 py-1 rounded border border-gray-700">BACK</button>
        </div>
      </header>

      <div className="max-w-md mx-auto pt-24 px-4 space-y-6">
        <div className="text-center mb-4">
          <h2 className="text-2xl font-black text-yellow-400 mb-1 gaming-font tracking-wider">🏆 TOP COMPETITORS</h2>
          <p className="text-xs text-gray-400">Ranked by Match Wins and Trust Score</p>
        </div>

        {loading ? (
          <div className="flex justify-center mt-10"><div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div></div>
        ) : players.length === 0 ? (
          <div className="glass-panel p-8 rounded-xl text-center border border-gray-800">
            <p className="text-gray-400 text-sm gaming-font">NO MATCHES PLAYED YET</p>
          </div>
        ) : (
          <div className="space-y-3">
            {players.map((player, index) => (
              <div key={player.id} className="glass-panel p-4 rounded-xl border border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Rank Badge */}
                  <div className={`w-8 h-8 flex items-center justify-center rounded-full font-black text-sm ${
                    index === 0 ? 'bg-yellow-500 text-black' :
                    index === 1 ? 'bg-gray-400 text-black' :
                    index === 2 ? 'bg-orange-600 text-white' :
                    'bg-gray-800 text-gray-400'
                  }`}>
                    {index + 1}
                  </div>
                  
                  <PlayerAvatar username={player.username} avatarUrl={player.avatar_url} avatarPreset={player.avatar_preset} className="h-11 w-11 border border-white/15 text-lg" />
                  <div>
                    <h3 className="font-black text-white text-sm gaming-font">{player.username}</h3>
                    <p className="text-[10px] text-gray-500 font-bold">{player.main_game}</p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-lg font-black text-white gaming-font">
                    <span className="text-green-400">{player.wins}W</span>
                    <span className="text-gray-600 mx-1">-</span>
                    <span className="text-red-400">{player.losses}L</span>
                  </p>
                  <p className="text-[10px] text-yellow-400 font-bold flex items-center justify-end gap-1">
                    {player.avg_score ? player.avg_score.toFixed(1) : 'N/A'} <span className="text-yellow-400">★</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}