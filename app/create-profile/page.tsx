'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../utils/supabase';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

const GAMES = [
  { name: 'PUBG Mobile', label: 'BATTLE ROYALE', accent: 'text-orange-500', border: 'border-orange-500/30', gradient: 'from-orange-700 via-yellow-600 to-orange-900', bgImage: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80' },
  { name: 'Call of Duty Mobile', label: 'TACTICAL OPS', accent: 'text-blue-500', border: 'border-blue-500/30', gradient: 'from-slate-800 via-blue-900 to-slate-950', bgImage: 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format&fit=crop&w=800&q=80' },
  { name: 'FIFA / EA FC', label: 'FOOTBALL', accent: 'text-green-500', border: 'border-green-500/30', gradient: 'from-green-700 via-emerald-600 to-green-900', bgImage: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=800&q=80' },
  { name: 'Free Fire', label: 'SURVIVAL', accent: 'text-red-500', border: 'border-red-500/30', gradient: 'from-red-700 via-orange-600 to-red-900', bgImage: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=800&q=80' },
  { name: 'eFootball', label: 'FOOTBALL SIM', accent: 'text-sky-400', border: 'border-sky-500/30', gradient: 'from-sky-700 via-blue-600 to-sky-900', bgImage: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=800&q=80' },
];

const getGameTheme = (game: string) => {
  const found = GAMES.find((g) => g.name === game);
  if (found) return found;
  return { name: game, label: 'GAMING', accent: 'text-gray-400', border: 'border-gray-500/30', gradient: 'from-gray-700 via-gray-800 to-gray-950', bgImage: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80' };
};

const getTier = (wins: number) => {
  if (wins >= 10) return { name: 'LEGEND', color: 'text-purple-400', ring: 'border-purple-500', chip: 'bg-purple-500/20 text-purple-400 border-purple-500/50' };
  if (wins >= 6) return { name: 'GOLD', color: 'text-yellow-400', ring: 'border-yellow-500', chip: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' };
  if (wins >= 3) return { name: 'SILVER', color: 'text-gray-300', ring: 'border-gray-300', chip: 'bg-gray-500/20 text-gray-300 border-gray-400/50' };
  return { name: 'BRONZE', color: 'text-amber-600', ring: 'border-amber-600', chip: 'bg-amber-600/20 text-amber-600 border-amber-600/50' };
};

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [trustScore, setTrustScore] = useState(0);
  const [totalRatings, setTotalRatings] = useState(0);
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [isCaptain, setIsCaptain] = useState(false);
  const [myTeamIds, setMyTeamIds] = useState<string[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [editMode, setEditMode] = useState(false);

  const [username, setUsername] = useState('');
  const [mainGame, setMainGame] = useState('PUBG Mobile');
  const [county, setCounty] = useState('Nairobi');
  const [campus, setCampus] = useState('');

  const router = useRouter();

  useEffect(() => { init(); }, []);

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }

    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (prof) {
      setProfile(prof);
      setUsername(prof.username);
      setMainGame(prof.main_game);
      setCounty(prof.county);
      setCampus(prof.campus || '');
    }

    const { data: stats } = await supabase.rpc('get_trust_score', { user_id: user.id });
    if (stats && stats.length > 0) {
      setTrustScore(stats[0].avg_score);
      setTotalRatings(stats[0].total_ratings);
    }

    const { data: mstats } = await supabase.rpc('get_player_stats', { p_user_id: user.id });
    if (mstats && mstats.length > 0) {
      setWins(mstats[0].wins);
      setLosses(mstats[0].losses);
    }

    const { data: capt } = await supabase.from('teams').select('id').eq('captain_id', user.id);
    setIsCaptain(!!capt && capt.length > 0);

    const { data: memberships } = await supabase.from('team_members').select('team_id').eq('user_id', user.id);
    const teamIds = memberships?.map((m: any) => m.team_id) || [];
    setMyTeamIds(teamIds);

    if (teamIds.length > 0) {
      const { data: hist } = await supabase
        .from('matches')
        .select('id, status, winner_id, team_a_id, team_b_id, events(title), teams_a:team_a_id(name), teams_b:team_b_id(name)')
        .in('status', ['team_a_win', 'team_b_win'])
        .or(`team_a_id.in.(${teamIds.join(',')}),team_b_id.in.(${teamIds.join(',')})`)
        .order('updated_at', { ascending: false })
        .limit(5);
      if (hist) setHistory(hist);
    }
    setLoading(false);
  };

  const saveProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase
      .from('profiles')
      .update({ username, main_game: mainGame, county, campus: campus || null })
      .eq('id', user.id);
    if (error) alert('Error saving: ' + error.message);
    else { setEditMode(false); init(); }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!profile) return null;

  const theme = getGameTheme(profile.main_game);
  const tier = getTier(wins);

  const badges = [
    isCaptain && { icon: '🛡️', label: 'CAPTAIN' },
    totalRatings >= 5 && trustScore >= 4 && { icon: '⭐', label: 'VERIFIED' },
    wins >= 1 && { icon: '🏆', label: 'FIRST BLOOD' },
    profile.is_admin && { icon: '🎖️', label: 'ADMIN' },
  ].filter(Boolean) as { icon: string; label: string }[];

  return (
    <main className="min-h-screen pb-24">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 glass-panel border-b border-green-900/50">
        <div className="max-w-md mx-auto p-4 flex justify-between items-center">
          <h1 className="text-xl font-black neon-text-green gaming-font">GAMER <span className="text-white">CARD</span></h1>
          <button onClick={() => router.push('/')} className="text-xs bg-gray-800 hover:bg-gray-700 px-3 py-1 rounded border border-gray-700">BACK</button>
        </div>
      </header>

      <div className="max-w-md mx-auto pt-20 px-4 space-y-4">
        {/* THE GAMER CARD */}
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className={`glass-panel rounded-xl overflow-hidden border ${theme.border} shadow-xl`}>
          {/* Banner in your game's art */}
          <div className={`relative h-32 bg-gradient-to-br ${theme.gradient}`}>
            <img src={theme.bgImage} alt={profile.main_game} onError={(e) => { e.currentTarget.style.display = 'none'; }} className="absolute inset-0 w-full h-full object-cover opacity-60" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
            <div className="absolute top-3 right-3 bg-black/80 backdrop-blur-sm px-2 py-1 rounded border border-white/10">
              <p className={`text-[10px] font-black ${theme.accent} gaming-font tracking-widest`}>{theme.label}</p>
            </div>
            <div className={`absolute top-3 left-3 px-2 py-1 rounded border ${tier.chip}`}>
              <p className="text-[10px] font-black gaming-font tracking-widest">{tier.name} TIER</p>
            </div>
          </div>

          {/* Avatar + Identity */}
          <div className="px-4 pb-4 bg-black/60">
            <div className={`-mt-8 w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-blue-600 border-4 ${tier.ring} flex items-center justify-center text-2xl font-black text-black shadow-lg`}>
              {profile.username.charAt(0).toUpperCase()}
            </div>
            <div className="mt-2 flex justify-between items-start">
              <div>
                <h2 className="text-xl font-black text-white gaming-font">{profile.username}</h2>
                <p className="text-xs text-gray-400">📍 {profile.county}{profile.campus ? ` • ${profile.campus}` : ''}</p>
              </div>
              <button onClick={() => setEditMode(!editMode)} className="text-[10px] bg-gray-800 hover:bg-gray-700 px-3 py-1 rounded border border-gray-700 font-bold">
                {editMode ? 'CLOSE' : '✏️ EDIT'}
              </button>
            </div>

            {/* Badges */}
            {badges.length > 0 && (
              <div className="flex gap-2 mt-3 flex-wrap">
                {badges.map((b) => (
                  <span key={b.label} className="text-[9px] bg-gray-800/80 border border-gray-700 px-2 py-1 rounded font-black gaming-font tracking-wider text-gray-200">
                    {b.icon} {b.label}
                  </span>
                ))}
              </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-2 mt-4 text-center">
              <div className="bg-black/60 rounded-lg p-2 border border-gray-800">
                <p className="text-[9px] text-gray-500 uppercase font-bold">Trust</p>
                <p className="text-lg font-black text-green-400 neon-text-green gaming-font">{trustScore > 0 ? trustScore.toFixed(1) : 'N/A'}</p>
              </div>
              <div className="bg-black/60 rounded-lg p-2 border border-gray-800">
                <p className="text-[9px] text-gray-500 uppercase font-bold">Record</p>
                <p className="text-lg font-black gaming-font"><span className="text-green-400">{wins}W</span><span className="text-gray-600 mx-1">-</span><span className="text-red-400">{losses}L</span></p>
              </div>
              <div className="bg-black/60 rounded-lg p-2 border border-gray-800">
                <p className="text-[9px] text-gray-500 uppercase font-bold">Tier</p>
                <p className={`text-lg font-black gaming-font ${tier.color}`}>{tier.name}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* EDIT FORM */}
        {editMode && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-4 rounded-xl border border-green-500/30 space-y-3">
            <label className="block text-[10px] text-gray-400 uppercase tracking-widest font-bold">Gamer Tag</label>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full bg-black/80 border border-gray-700 p-2 rounded text-sm text-white focus:border-green-500 outline-none" />
            <label className="block text-[10px] text-gray-400 uppercase tracking-widest font-bold">Main Game</label>
            <select value={mainGame} onChange={(e) => setMainGame(e.target.value)} className="w-full bg-black/80 border border-gray-700 p-2 rounded text-sm text-white focus:border-green-500 outline-none">
              {GAMES.map((g) => <option key={g.name}>{g.name}</option>)}
            </select>
            <label className="block text-[10px] text-gray-400 uppercase tracking-widest font-bold">County</label>
            <select value={county} onChange={(e) => setCounty(e.target.value)} className="w-full bg-black/80 border border-gray-700 p-2 rounded text-sm text-white focus:border-green-500 outline-none">
              <option>Nairobi</option><option>Mombasa</option><option>Kisumu</option><option>Nakuru</option><option>Kiambu</option><option>Machakos</option><option>Kajiado</option><option>Uasin Gishu</option><option>Meru</option><option>Nyeri</option><option>Kakamega</option><option>Other</option>
            </select>
            <label className="block text-[10px] text-gray-400 uppercase tracking-widest font-bold">Campus / Area</label>
            <input type="text" value={campus} onChange={(e) => setCampus(e.target.value)} placeholder="e.g., KU Main Campus" className="w-full bg-black/80 border border-gray-700 p-2 rounded text-sm text-white focus:border-green-500 outline-none" />
            <motion.button onClick={saveProfile} className="w-full bg-green-500 hover:bg-green-400 text-black py-2 rounded font-black text-sm gaming-font tracking-wider" whileTap={{ scale: 0.98 }}>
              SAVE CARD
            </motion.button>
          </motion.div>
        )}

        {/* BATTLE HISTORY */}
        <div className="glass-panel p-4 rounded-xl border border-gray-800">
          <h3 className="text-sm font-bold text-gray-500 mb-3 uppercase tracking-widest">Battle History</h3>
          {history.length === 0 ? (
            <p className="text-xs text-gray-500 italic">No completed battles yet. Your legend starts with the first win.</p>
          ) : (
            <div className="space-y-2">
              {history.map((m) => {
                const iWasA = myTeamIds.includes(m.team_a_id);
                const myTeamId = iWasA ? m.team_a_id : m.team_b_id;
                const won = m.winner_id === myTeamId;
                const opponent = iWasA ? m.teams_b?.name : m.teams_a?.name;
                return (
                  <div key={m.id} className="flex justify-between items-center bg-black/50 border border-gray-800 rounded-lg px-3 py-2">
                    <div>
                      <p className="text-xs font-bold text-white">vs {opponent}</p>
                      <p className="text-[10px] text-gray-500">{m.events?.title || 'Friendly Match'}</p>
                    </div>
                    <span className={`text-sm font-black gaming-font ${won ? 'text-green-400' : 'text-red-400'}`}>{won ? 'W' : 'L'}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}