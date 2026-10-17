'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../utils/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import PlayerAvatar from '../components/PlayerAvatar';

interface Team {
  id: string;
  name: string;
  tag: string;
  main_game: string;
  whatsapp_link: string;
  profiles: { username: string; avatar_url: string | null; avatar_preset: string | null };
}

const GAMES = [
  { name: 'PUBG Mobile', label: 'BATTLE ROYALE', accent: 'text-orange-500', border: 'border-orange-500/30', glow: 'shadow-orange-500/20', gradient: 'from-orange-700 via-yellow-600 to-orange-900', bgImage: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80' },
  { name: 'Call of Duty Mobile', label: 'TACTICAL OPS', accent: 'text-blue-500', border: 'border-blue-500/30', glow: 'shadow-blue-500/20', gradient: 'from-slate-800 via-blue-900 to-slate-950', bgImage: 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format&fit=crop&w=800&q=80' },
  { name: 'FIFA / EA FC', label: 'FOOTBALL', accent: 'text-green-500', border: 'border-green-500/30', glow: 'shadow-green-500/20', gradient: 'from-green-700 via-emerald-600 to-green-900', bgImage: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=800&q=80' },
  { name: 'Free Fire', label: 'SURVIVAL', accent: 'text-red-500', border: 'border-red-500/30', glow: 'shadow-red-500/20', gradient: 'from-red-700 via-orange-600 to-red-900', bgImage: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=800&q=80' },
  { name: 'eFootball', label: 'FOOTBALL SIM', accent: 'text-sky-400', border: 'border-sky-500/30', glow: 'shadow-sky-500/20', gradient: 'from-sky-700 via-blue-600 to-sky-900', bgImage: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=800&q=80' },
];

const getGameTheme = (game: string) => {
  const found = GAMES.find((g) => g.name === game);
  if (found) return found;
  return { name: game, label: 'GAMING', accent: 'text-gray-400', border: 'border-gray-500/30', glow: 'shadow-gray-500/20', gradient: 'from-gray-700 via-gray-800 to-gray-950', bgImage: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80' };
};

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  const [teamName, setTeamName] = useState('');
  const [teamTag, setTeamTag] = useState('');
  const [teamGame, setTeamGame] = useState('PUBG Mobile');
  const [teamWhatsapp, setTeamWhatsapp] = useState('');

  const router = useRouter();

  const fetchTeams = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('teams')
      .select('*, profiles:captain_id(username, avatar_url, avatar_preset)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase Fetch Error:', error);
    }
    if (!error && data) {
      setTeams(data as Team[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchTeams();
  }, []);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: teamData, error: teamError } = await supabase
      .from('teams')
      .insert({
        name: teamName,
        tag: teamTag,
        captain_id: user.id,
        main_game: teamGame,
        whatsapp_link: teamWhatsapp,
      })
      .select()
      .single();

    if (teamError) {
      alert('Error creating team: ' + teamError.message);
      return;
    }

    const { error: memberError } = await supabase
      .from('team_members')
      .insert({
        team_id: teamData.id,
        user_id: user.id,
        role: 'captain',
      });

    if (memberError) {
      alert('Team created, but failed to add you as captain: ' + memberError.message);
    } else {
      setShowForm(false);
      setTeamName('');
      setTeamTag('');
      setTeamWhatsapp('');
      fetchTeams();
    }
  };

  return (
    <main className="min-h-screen pb-24">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 glass-panel border-b border-blue-900/50">
        <div className="max-w-md mx-auto p-4 flex justify-between items-center">
          <h1 className="text-xl font-black text-blue-400 gaming-font">SQUAD <span className="text-white">ROSTER</span></h1>
          <button onClick={() => router.push('/')} className="text-xs bg-gray-800 hover:bg-gray-700 px-3 py-1 rounded border border-gray-700">BACK</button>
        </div>
      </header>

      <div className="max-w-md mx-auto pt-24 px-4 space-y-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-black text-white gaming-font tracking-wider">TEAMS & CLANS</h2>
          <motion.button
            onClick={() => setShowForm(!showForm)}
            className="bg-green-500 hover:bg-green-400 text-black px-4 py-2 rounded font-black text-xs gaming-font tracking-wider shadow-[0_0_12px_rgba(57,255,20,0.4)]"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {showForm ? 'CANCEL' : '+ CREATE TEAM'}
          </motion.button>
        </div>

        {/* Create Team Form */}
        <AnimatePresence>
          {showForm && (
            <motion.form
              onSubmit={handleCreateTeam}
              className="glass-panel p-4 rounded-xl border border-green-500/30 space-y-3"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div>
                <label className="block text-[10px] text-gray-400 mb-1 uppercase tracking-widest font-bold">Team Name</label>
                <input type="text" value={teamName} onChange={(e) => setTeamName(e.target.value)} required className="w-full bg-black/80 border border-gray-700 p-2 rounded text-sm text-white focus:border-green-500 outline-none" placeholder="e.g., Nairobi Snipers" />
              </div>
              <div>
                <label className="block text-[10px] text-gray-400 mb-1 uppercase tracking-widest font-bold">Team Tag (Max 4 letters)</label>
                <input type="text" value={teamTag} onChange={(e) => setTeamTag(e.target.value.toUpperCase())} maxLength={4} required className="w-full bg-black/80 border border-gray-700 p-2 rounded text-sm text-white focus:border-green-500 outline-none" placeholder="e.g., NS" />
              </div>
              <div>
                <label className="block text-[10px] text-gray-400 mb-1 uppercase tracking-widest font-bold">Main Game</label>
                <select value={teamGame} onChange={(e) => setTeamGame(e.target.value)} className="w-full bg-black/80 border border-gray-700 p-2 rounded text-sm text-white focus:border-green-500 outline-none">
                  {GAMES.map((g) => (
                    <option key={g.name}>{g.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-gray-400 mb-1 uppercase tracking-widest font-bold">WhatsApp Group Link</label>
                <input type="text" placeholder="https://chat.whatsapp.com/..." value={teamWhatsapp} onChange={(e) => setTeamWhatsapp(e.target.value)} className="w-full bg-black/80 border border-gray-700 p-2 rounded text-sm text-white focus:border-green-500 outline-none" />
              </div>
              <motion.button type="submit" className="w-full bg-green-500 hover:bg-green-400 text-black py-2 rounded font-black text-sm gaming-font tracking-wider" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                CREATE SQUAD
              </motion.button>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Teams List */}
        {loading ? (
          <div className="flex justify-center mt-10"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div></div>
        ) : teams.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel p-8 rounded-xl text-center border border-gray-800">
            <p className="text-gray-400 text-sm gaming-font">NO SQUADS YET. CREATE THE FIRST!</p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {teams.map((team, index) => {
              const theme = getGameTheme(team.main_game);
              return (
                <motion.div
                  key={team.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.08 }}
                  whileHover={{ y: -4 }}
                  className={`glass-panel rounded-xl overflow-hidden border ${theme.border} shadow-lg ${theme.glow}`}
                >
                  {/* Game Banner */}
                  <div className={`relative h-24 w-full overflow-hidden bg-gradient-to-br ${theme.gradient}`}>
                    <img
                      src={theme.bgImage}
                      alt={team.main_game}
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      className="absolute inset-0 w-full h-full object-cover opacity-60"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
                    <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-sm px-2 py-1 rounded border border-white/10">
                      <p className={`text-[9px] font-black ${theme.accent} gaming-font tracking-widest`}>{theme.label}</p>
                    </div>
                    <div className="absolute bottom-2 left-3 right-3">
                      <h3 className="text-lg font-black text-white gaming-font tracking-wider drop-shadow-lg">
                        {team.name} <span className={`${theme.accent} text-sm`}>[{team.tag}]</span>
                      </h3>
                    </div>
                  </div>

                  {/* Team Info */}
                  <div className="p-4 bg-black/60 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full"></span>
                      <PlayerAvatar
                        username={team.profiles?.username || 'Unknown'}
                        avatarUrl={team.profiles?.avatar_url}
                        avatarPreset={team.profiles?.avatar_preset}
                        className="h-6 w-6 border border-white/15 text-xs"
                      />
                      <p className="text-xs text-gray-300">
                        Captain: <span className="font-bold text-white">{team.profiles?.username || 'Unknown'}</span>
                      </p>
                    </div>

                    {team.whatsapp_link && (
                      <motion.a
                        href={team.whatsapp_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full text-center bg-green-600/20 text-green-400 border border-green-500/50 py-2 rounded font-black text-xs gaming-font tracking-wider shadow-[0_0_10px_rgba(57,255,20,0.2)]"
                        whileHover={{ backgroundColor: "rgba(34, 197, 94, 1)", color: "black", boxShadow: "0px 0px 20px rgba(57, 255, 20, 0.8)" }}
                        whileTap={{ scale: 0.95 }}
                      >
                        JOIN TEAM WHATSAPP 💬
                      </motion.a>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}