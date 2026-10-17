// app/create-profile/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { useRouter } from 'next/navigation';

export default function CreateProfilePage() {
  const [username, setUsername] = useState('');
  const [mainGame, setMainGame] = useState('PUBG Mobile');
  const [county, setCounty] = useState('Nairobi');
  const [campus, setCampus] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Check if they are actually logged in
  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login'); // Kick them out if not logged in
      }
    };
    checkUser();
  }, [router]);

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Insert into the profiles table we built in Phase 1
        const { error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        username: username,
        phone_number: user.phone,
        main_game: mainGame,
        county: county,
        campus: campus || null,
        trust_tier: 'New',
        is_admin: false,
      }, { onConflict: 'id' }); 

    if (error) {
      alert('Error creating profile: ' + error.message);
      setLoading(false);
    } else {
      // Success! Redirect to the main dashboard (we will build this next)
      router.push('/'); 
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white p-4">
      <div className="w-full max-w-md bg-gray-800 p-8 rounded-2xl shadow-xl">
        <h2 className="text-2xl font-bold text-center mb-2">Create Your Passport</h2>
        <p className="text-center text-gray-400 mb-6 text-sm">Build your local gaming identity.</p>

        <form onSubmit={handleCreateProfile} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Gamer Tag / Username</label>
            <input
              type="text"
              placeholder="e.g., NairobiSniper"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Main Game</label>
            <select
              value={mainGame}
              onChange={(e) => setMainGame(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none"
            >
              <option>PUBG Mobile</option>
              <option>Call of Duty Mobile</option>
              <option>FIFA / EA FC</option>
              <option>Free Fire</option>
              <option>eFootball</option>
              <option>Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">County / Town</label>
            <input
              type="text"
              placeholder="e.g., Nairobi, Mombasa, Kisumu"
              value={county}
              onChange={(e) => setCounty(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Campus (Optional)</label>
            <input
              type="text"
              placeholder="e.g., UoN, JKUAT, Strathmore"
              value={campus}
              onChange={(e) => setCampus(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-4 bg-green-600 hover:bg-green-700 rounded-lg font-bold transition disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Enter MchezoPass'}
          </button>
        </form>
      </div>
    </main>
  );
}