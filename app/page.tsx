'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';
import { useRouter } from 'next/navigation';
import LfgBoard from './components/LfgBoard';
import PlayerAvatar from './components/PlayerAvatar';

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarPreset, setAvatarPreset] = useState<string | null>('rookie');
  const [isAdmin, setIsAdmin] = useState(false);
  const [trustScore, setTrustScore] = useState(0);
  const [totalRatings, setTotalRatings] = useState(0);
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsLoggedIn(true);

        // Fetch profile (username + admin status)
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, is_admin, avatar_url, avatar_preset')
          .eq('id', session.user.id)
          .single();
        if (profile) {
          setUsername(profile.username);
          setIsAdmin(profile.is_admin === true);
          setAvatarUrl(profile.avatar_url);
          setAvatarPreset(profile.avatar_preset);
        }

        // Fetch real Trust Score
        const { data: stats, error } = await supabase.rpc('get_trust_score', { user_id: session.user.id });
        if (!error && stats && stats.length > 0) {
          setTrustScore(stats[0].avg_score);
          setTotalRatings(stats[0].total_ratings);
        }

        // Fetch W/L Record
        const { data: matchStats } = await supabase.rpc('get_player_stats', { p_user_id: session.user.id });
        if (matchStats && matchStats.length > 0) {
          setWins(matchStats[0].wins);
          setLosses(matchStats[0].losses);
        }
      } else {
        router.push('/login');
      }
    };
    checkSession();
  }, [router]);

  const scrollToFeed = () => {
    document.getElementById('lfg-feed')?.scrollIntoView({ behavior: 'smooth' });
  };

  if (!isLoggedIn) {
    return <div className="flex min-h-screen items-center justify-center bg-black text-green-400 gaming-font">INITIALIZING MCHEZOPASS...</div>;
  }

  return (
    <main className="min-h-screen pb-24 relative overflow-hidden">
      
      {/* Top Status Bar (Game HUD) */}
      <header className="fixed top-0 w-full z-50 glass-panel border-b border-green-900/50">
        <div className="max-w-md mx-auto p-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-black neon-text-green">MCHEZO<span className="text-white">PASS</span></h1>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button 
                onClick={() => router.push('/admin')} 
                className="bg-red-600/20 text-red-400 border border-red-500/50 px-2 py-1 rounded text-[10px] font-black gaming-font hover:bg-red-600 hover:text-white transition"
              >
                ADMIN
              </button>
            )}
            <div className="text-right">
              <p className="text-xs text-gray-400 font-bold">PLAYER</p>
              <p className="text-sm font-bold text-white">{username}</p>
            </div>
            {/* Tap avatar → open Gamer Card */}
            <button onClick={() => router.push('/profile')} aria-label="Open player profile" className="rounded-full border-2 border-green-300 shadow-[0_0_14px_rgba(57,255,20,.22)] transition hover:scale-110">
              <PlayerAvatar username={username} avatarUrl={avatarUrl} avatarPreset={avatarPreset} className="h-9 w-9 text-base" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-md mx-auto pt-24 px-4 space-y-6">
        
        {/* Hero Card: Featured Event */}
        <div className="relative group cursor-pointer" onClick={() => router.push('/events')}>
          <div className="absolute -inset-0.5 bg-gradient-to-r from-green-600 to-purple-600 rounded-lg blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative bg-black rounded-lg p-6 border border-gray-800">
            <div className="flex justify-between items-start mb-4">
              <span className="bg-green-900/50 text-green-400 text-xs font-bold px-2 py-1 rounded border border-green-800">LIVE EVENT</span>
              <span className="text-2xl">🏆</span>
            </div>
            <h2 className="text-2xl font-black text-white mb-1 gaming-font">SUNDAY PUBG CUP</h2>
            <p className="text-gray-400 text-sm mb-4">Squad up and win KES 5,000</p>
            <button className="w-full bg-green-500 hover:bg-green-400 text-black font-black py-2 rounded gaming-font tracking-wider transition transform hover:scale-105">
              JOIN BATTLE
            </button>
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div>
          <h3 className="text-sm font-bold text-gray-500 mb-3 uppercase tracking-widest">Main Menu</h3>
          <div className="grid grid-cols-2 gap-4">
            <button onClick={scrollToFeed} className="glass-panel p-4 rounded-lg border-l-4 border-green-500 hover:bg-green-900/20 transition text-left group">
              <span className="text-3xl block mb-2 group-hover:scale-110 transition">🔍</span>
              <span className="text-white font-bold block gaming-font">LFG</span>
              <span className="text-xs text-gray-400">Find Squad</span>
            </button>
            <button onClick={() => router.push('/teams')} className="glass-panel p-4 rounded-lg border-l-4 border-blue-500 hover:bg-blue-900/20 transition text-left group">
              <span className="text-3xl block mb-2 group-hover:scale-110 transition">🛡️</span>
              <span className="text-white font-bold block gaming-font">CLANS</span>
              <span className="text-xs text-gray-400">My Team</span>
            </button>
            <button onClick={() => router.push('/matches')} className="glass-panel p-4 rounded-lg border-l-4 border-red-500 hover:bg-red-900/20 transition text-left group">
              <span className="text-3xl block mb-2 group-hover:scale-110 transition">⚔️</span>
              <span className="text-white font-bold block gaming-font">MATCHES</span>
              <span className="text-xs text-gray-400">Results</span>
            </button>
            <button onClick={() => router.push('/leaderboard')} className="glass-panel p-4 rounded-lg border-l-4 border-yellow-500 hover:bg-yellow-900/20 transition text-left group">
              <span className="text-3xl block mb-2 group-hover:scale-110 transition">👑</span>
              <span className="text-white font-bold block gaming-font">RANKS</span>
              <span className="text-xs text-gray-400">Top Players</span>
            </button>
          </div>
        </div>

        {/* Player Stats: Trust + W/L Record + Status */}
        <div className="glass-panel p-4 rounded-lg border border-gray-800">
          <h3 className="text-sm font-bold text-gray-500 mb-3 uppercase tracking-widest">Player Stats</h3>
          <div className="flex justify-around items-center text-center">
            <div>
              <p className="text-[10px] text-gray-500 uppercase font-bold">Trust</p>
              <p className="text-xl font-black text-green-400 neon-text-green gaming-font">
                {trustScore > 0 ? trustScore.toFixed(1) : 'N/A'}
              </p>
            </div>
            <div className="border-l border-gray-700 pl-4">
              <p className="text-[10px] text-gray-500 uppercase font-bold">Record</p>
              <p className="text-xl font-black text-white gaming-font">
                <span className="text-green-400">{wins}W</span>
                <span className="text-gray-600 mx-1">-</span>
                <span className="text-red-400">{losses}L</span>
              </p>
            </div>
            <div className="border-l border-gray-700 pl-4">
              <p className="text-[10px] text-gray-500 uppercase font-bold">Status</p>
              <p className="text-sm font-black text-yellow-400 gaming-font mt-1">
                {totalRatings > 5 ? 'VERIFIED' : totalRatings > 0 ? 'ACTIVE' : 'NEW'}
              </p>
            </div>
          </div>
        </div>

        {/* LIVE LFG FEED */}
        <div id="lfg-feed" className="pt-2">
          <LfgBoard />
        </div>

      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 w-full glass-panel border-t border-green-900/50 pb-safe z-50">
        <div className="max-w-md mx-auto flex justify-around items-center p-3">
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="flex flex-col items-center text-green-400">
            <span className="text-xl">🏠</span>
            <span className="text-[10px] font-bold mt-1 gaming-font">HOME</span>
          </button>
          <button onClick={() => router.push('/events')} className="flex flex-col items-center text-gray-500 hover:text-purple-400 transition">
            <span className="text-xl">🏆</span>
            <span className="text-[10px] font-bold mt-1 gaming-font">EVENTS</span>
          </button>
          <button onClick={scrollToFeed} className="relative -top-5 bg-green-500 text-black w-12 h-12 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(57,255,20,0.6)] hover:scale-110 transition">
            <span className="text-2xl font-bold">+</span>
          </button>
          <button onClick={() => router.push('/matches')} className="flex flex-col items-center text-gray-500 hover:text-red-400 transition">
            <span className="text-xl">⚔️</span>
            <span className="text-[10px] font-bold mt-1 gaming-font">MATCHES</span>
          </button>
          <button onClick={() => router.push('/leaderboard')} className="flex flex-col items-center text-gray-500 hover:text-yellow-400 transition">
            <span className="text-xl">👑</span>
            <span className="text-[10px] font-bold mt-1 gaming-font">RANKS</span>
          </button>
        </div>
      </nav>
    </main>
  );
}