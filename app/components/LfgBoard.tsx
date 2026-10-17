'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../utils/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import PlayerAvatar from './PlayerAvatar';

interface LfgPost {
  id: string;
  game: string;
  message: string;
  location: string;
  whatsapp_link: string;
  created_at: string;
  profiles: { username: string; avatar_url: string | null; avatar_preset: string | null };
}

// SINGLE SOURCE OF TRUTH: art + color identity + gradient fallback for every game
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

export default function LfgBoard() {
  const [posts, setPosts] = useState<LfgPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [gameFilter, setGameFilter] = useState<string | null>(null);
  const [game, setGame] = useState('PUBG Mobile');
  const [message, setMessage] = useState('');
  const [location, setLocation] = useState('Nairobi');
  const [whatsappLink, setWhatsappLink] = useState('');

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('lfg_posts')
      .select('*, profiles(username, avatar_url, avatar_preset)')
      .order('created_at', { ascending: false })
      .limit(20);

    if (gameFilter) query = query.eq('game', gameFilter);

    const { data, error } = await query;
    if (!error && data) setPosts(data as LfgPost[]);
    setLoading(false);
  }, [gameFilter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchPosts();
  }, [fetchPosts]);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
        const { error } = await supabase.from('lfg_posts').insert({ user_id: user.id, game, message, location, whatsapp_link: whatsappLink });
    if (!error) { 
      setShowForm(false); 
      setMessage(''); 
      setWhatsappLink(''); 
      fetchPosts(); 
    } else {
      alert('Error posting to lobby: ' + error.message);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* GAME LAUNCHER ROW */}
      <div>
        <h3 className="text-sm font-bold text-gray-500 mb-2 uppercase tracking-widest">Choose Your Battle</h3>
        <div className="flex gap-3 overflow-x-auto pb-2">
          <button
            onClick={() => setGameFilter(null)}
            className={`flex-shrink-0 px-4 h-16 rounded-lg font-black text-xs gaming-font border transition ${
              !gameFilter
                ? 'bg-green-500 text-black border-green-400 shadow-[0_0_12px_rgba(57,255,20,0.5)]'
                : 'bg-black/60 text-gray-300 border-gray-700 hover:border-gray-500'
            }`}
          >
            ALL
          </button>
          {GAMES.map((g) => (
            <button
              key={g.name}
              onClick={() => setGameFilter(g.name)}
              className={`relative flex-shrink-0 w-28 h-16 rounded-lg overflow-hidden border transition hover:scale-105 bg-gradient-to-br ${g.gradient} ${
                gameFilter === g.name ? 'border-green-400 shadow-[0_0_12px_rgba(57,255,20,0.4)]' : g.border
              }`}
            >
              <img
                src={g.bgImage}
                alt={g.name}
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                className="absolute inset-0 w-full h-full object-cover opacity-70"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
              <div className="absolute bottom-1 left-2 right-1 text-left">
                <p className="text-[10px] font-black text-white gaming-font leading-none truncate">{g.name}</p>
                <p className={`text-[8px] font-bold ${g.accent} tracking-widest`}>{g.label}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Header with Live Indicator */}
      <motion.div 
        className="flex justify-between items-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
          <h2 className="text-xl font-black text-white gaming-font tracking-wider">
            LIVE LOBBY {gameFilter && <span className="text-green-400">• {gameFilter.toUpperCase()}</span>}
          </h2>
        </div>
        <motion.button 
          onClick={() => setShowForm(!showForm)} 
          className="bg-green-500 hover:bg-green-400 text-black px-4 py-1.5 rounded font-black text-xs gaming-font tracking-wider shadow-[0_0_15px_rgba(57,255,20,0.5)]"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {showForm ? 'CLOSE' : '+ DROP POST'}
        </motion.button>
      </motion.div>

      {/* Create Post Form */}
      <AnimatePresence>
        {showForm && (
          <motion.form 
            onSubmit={handleCreatePost} 
            className="glass-dark p-4 rounded-xl border border-green-500/30 space-y-3"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <select value={game} onChange={(e) => setGame(e.target.value)} className="w-full bg-black/80 border border-gray-700 p-2 rounded text-sm text-white focus:border-green-500 outline-none">
              {GAMES.map((g) => (
                <option key={g.name}>{g.name}</option>
              ))}
            </select>
            <input type="text" value={message} onChange={(e) => setMessage(e.target.value)} required placeholder="Squad message..." className="w-full bg-black/80 border border-gray-700 p-2 rounded text-sm text-white focus:border-green-500 outline-none" />
            <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} required placeholder="Location" className="w-full bg-black/80 border border-gray-700 p-2 rounded text-sm text-white focus:border-green-500 outline-none" />
            <input type="text" placeholder="WhatsApp Link" value={whatsappLink} onChange={(e) => setWhatsappLink(e.target.value)} className="w-full bg-black/80 border border-gray-700 p-2 rounded text-sm text-white focus:border-green-500 outline-none" />
            <motion.button type="submit" className="w-full bg-green-500 hover:bg-green-400 text-black py-2 rounded font-black text-sm gaming-font tracking-wider" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>POST TO LOBBY</motion.button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Posts Feed */}
      {loading ? (
        <div className="flex justify-center mt-10"><div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div></div>
      ) : posts.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center mt-10 glass-dark p-8 rounded-xl border border-gray-800">
          <p className="text-gray-400 text-sm gaming-font">
            {gameFilter ? `NO ${gameFilter.toUpperCase()} POSTS YET. DROP THE FIRST!` : 'LOBBY IS EMPTY. DROP THE FIRST POST!'}
          </p>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {posts.map((post, index) => {
            const theme = getGameTheme(post.game);
            return (
              <motion.div 
                key={post.id} 
                className={`glass-dark rounded-xl overflow-hidden border ${theme.border} shadow-lg ${theme.glow}`}
                initial={{ opacity: 0, y: 50, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -5, boxShadow: "0px 10px 30px rgba(0,0,0,0.5)" }}
              >
                <div className={`relative h-32 w-full overflow-hidden bg-gradient-to-br ${theme.gradient}`}>
                  <motion.img 
                    src={theme.bgImage} 
                    alt={post.game} 
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    className="absolute inset-0 w-full h-full object-cover opacity-60"
                    whileHover={{ scale: 1.1 }}
                    transition={{ duration: 0.7 }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>
                  
                  <div className="absolute top-3 left-3 bg-black/80 backdrop-blur-sm px-2 py-1 rounded border border-white/10">
                    <p className={`text-[10px] font-black ${theme.accent} gaming-font tracking-widest`}>{theme.label}</p>
                  </div>

                  <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
                    <div>
                      <h3 className="text-lg font-black text-white gaming-font tracking-wider drop-shadow-lg">{post.game.toUpperCase()}</h3>
                      <div className="mt-1 flex items-center gap-1.5 text-[10px] font-bold text-gray-300">
                        <PlayerAvatar
                          username={post.profiles?.username || 'Unknown'}
                          avatarUrl={post.profiles?.avatar_url}
                          avatarPreset={post.profiles?.avatar_preset}
                          className="h-5 w-5 border border-white/20 text-[10px]"
                        />
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-500"></span>
                        HOST: {post.profiles?.username || 'UNKNOWN'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-black/60">
                  <p className="text-gray-200 text-sm mb-3 font-medium leading-relaxed border-l-2 border-green-500 pl-3 italic">&quot;{post.message}&quot;</p>
                  
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] bg-gray-800/80 text-gray-300 px-2 py-1 rounded border border-gray-700 font-bold flex items-center gap-1">
                       {post.location}
                    </span>
                    <span className="text-[10px] text-gray-500 font-bold">
                      {new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  
                  {post.whatsapp_link && (
                    <motion.a 
                      href={post.whatsapp_link} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="block w-full text-center bg-green-600/20 text-green-400 border border-green-500/50 py-2 rounded font-black text-xs gaming-font tracking-wider shadow-[0_0_10px_rgba(57,255,20,0.2)]"
                      whileHover={{ backgroundColor: "rgba(34, 197, 94, 1)", color: "black", boxShadow: "0px 0px 20px rgba(57, 255, 20, 0.8)" }}
                      whileTap={{ scale: 0.95 }}
                    >
                      JOIN SQUAD 
                    </motion.a>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}