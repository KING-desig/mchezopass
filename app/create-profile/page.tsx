'use client';

import { useState } from 'react';
import { supabase } from '../../utils/supabase';
import { useRouter } from 'next/navigation';

export default function CreateProfilePage() {
  const [username, setUsername] = useState('');
  const [mainGame, setMainGame] = useState('PUBG Mobile');
  const [county, setCounty] = useState('Nairobi');
  const [campus, setCampus] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .upsert(
        {
          id: user.id,
          username: username,
          phone_number: user.phone,
          main_game: mainGame,
          county: county,
          campus: campus || null,
        },
        { onConflict: 'id' }
      );

    if (error) {
      alert('Error creating profile: ' + error.message);
    } else {
      router.push('/');
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-black neon-text-green gaming-font">MCHEZO<span className="text-white">PASS</span></h1>
          <p className="text-xs text-gray-400 uppercase tracking-widest mt-1">Create your Gamer Passport</p>
        </div>

        <form onSubmit={handleCreateProfile} className="glass-panel p-6 rounded-xl border border-green-500/30 space-y-4">
          <div>
            <label className="block text-[10px] text-gray-400 mb-1 uppercase tracking-widest font-bold">Gamer Tag (Username)</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              placeholder="e.g., NairobiSniper"
              className="w-full bg-black/80 border border-gray-700 p-3 rounded text-sm text-white focus:border-green-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-[10px] text-gray-400 mb-1 uppercase tracking-widest font-bold">Main Game</label>
            <select value={mainGame} onChange={(e) => setMainGame(e.target.value)} className="w-full bg-black/80 border border-gray-700 p-3 rounded text-sm text-white focus:border-green-500 outline-none">
              <option>PUBG Mobile</option>
              <option>Call of Duty Mobile</option>
              <option>FIFA / EA FC</option>
              <option>Free Fire</option>
              <option>eFootball</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] text-gray-400 mb-1 uppercase tracking-widest font-bold">County</label>
            <select value={county} onChange={(e) => setCounty(e.target.value)} className="w-full bg-black/80 border border-gray-700 p-3 rounded text-sm text-white focus:border-green-500 outline-none">
              <option>Nairobi</option>
              <option>Mombasa</option>
              <option>Kisumu</option>
              <option>Nakuru</option>
              <option>Kiambu</option>
              <option>Machakos</option>
              <option>Kajiado</option>
              <option>Uasin Gishu</option>
              <option>Meru</option>
              <option>Nyeri</option>
              <option>Kakamega</option>
              <option>Other</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] text-gray-400 mb-1 uppercase tracking-widest font-bold">Campus / Area (Optional)</label>
            <input
              type="text"
              value={campus}
              onChange={(e) => setCampus(e.target.value)}
              placeholder="e.g., KU Main Campus"
              className="w-full bg-black/80 border border-gray-700 p-3 rounded text-sm text-white focus:border-green-500 outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-500 hover:bg-green-400 text-black py-3 rounded font-black text-sm gaming-font tracking-wider transition disabled:opacity-50 shadow-[0_0_15px_rgba(57,255,20,0.4)]"
          >
            {loading ? 'SAVING PASSPORT...' : 'CREATE GAMER PASSPORT'}
          </button>
        </form>
      </div>
    </main>
  );
}