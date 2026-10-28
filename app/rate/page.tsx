'use client';

import { useState } from 'react';
import { supabase } from '../../utils/supabase'; // Change to '../utils/supabase' if your utils folder is inside 'app'
import { useRouter } from 'next/navigation';

export default function RatePlayerPage() {
  const [username, setUsername] = useState('');
  const [score, setScore] = useState(5);
  const [comment, setComment] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const { data: ratedUser, error: userError } = await supabase
      .from('profiles')
      .select('id')
      .ilike('username', username)
      .single();

    if (userError || !ratedUser) {
      setMessage('Player not found. Check the username.');
      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { 
      router.push('/login'); 
      return; 
    }

    const { error: ratingError } = await supabase.rpc('submit_rating', {
      p_rated_id: ratedUser.id,
      p_score: score,
      p_comment: comment,
    });

    if (ratingError) {
      setMessage('Error submitting rating.');
    } else {
      setMessage('Successfully rated ' + username + ' with ' + score + ' stars!');
      setUsername('');
      setComment('');
    }
    setLoading(false);
  };

  return (
    <main className="game-world min-h-screen bg-gray-900 text-white pb-20">
      <header className="bg-gray-800 border-b border-gray-700 p-4 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-green-400 cursor-pointer" onClick={() => router.push('/')}>MchezoPass</h1>
          <button onClick={() => router.push('/')} className="text-xs bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded">Back</button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4">
        <h2 className="text-xl font-bold mb-2">Rate a Teammate</h2>
        <p className="text-sm text-gray-400 mb-6">Help build the Trust Score.</p>

        <form onSubmit={handleSubmit} className="bg-gray-800 p-6 rounded-xl border border-gray-700 space-y-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Player Username</label>
            <input 
              type="text" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              required 
              className="w-full bg-gray-700 p-3 rounded text-sm text-white" 
            />
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-2">Rating (1 to 5 Stars)</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setScore(star)}
                  className={`text-2xl p-2 rounded ${score >= star ? 'text-yellow-400 bg-gray-700' : 'text-gray-600'}`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Comment (Optional)</label>
            <textarea 
              value={comment} 
              onChange={(e) => setComment(e.target.value)} 
              className="w-full bg-gray-700 p-3 rounded text-sm text-white h-20" 
            />
          </div>

          {message && (
            <p className="text-sm text-center p-2 rounded bg-green-900/30 text-green-400">
              {message}
            </p>
          )}

          <button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-green-600 hover:bg-green-700 py-3 rounded font-bold text-sm disabled:opacity-50"
          >
            {loading ? 'Submitting...' : 'Submit Rating'}
          </button>
        </form>
      </div>
    </main>
  );
}