'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { supabase } from '../../utils/supabase';
import { useRouter } from 'next/navigation';

interface Team {
  id: string;
  name: string;
  tag: string;
}

interface EventSummary {
  id: string;
  title: string;
}

interface MatchRecord {
  id: string;
  team_a_id: string;
  team_b_id: string;
  event_id?: string | null;
  screenshot_url?: string | null;
  teams_a?: { name: string; tag: string } | null;
  teams_b?: { name: string; tag: string } | null;
  events?: { title: string } | null;
}

export default function AdminDashboard() {
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showMatchForm, setShowMatchForm] = useState(false);
  const [teamA, setTeamA] = useState('');
  const [teamB, setTeamB] = useState('');
  const [eventId, setEventId] = useState('');
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  const checkAdminAndFetch = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (profile?.is_admin) {
      setIsAdmin(true);
      void fetchDisputedMatches();
      void fetchTeams();
      void fetchEvents();
    } else {
      alert('Access denied. Admins only.');
      router.push('/');
    }
  }, [router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void checkAdminAndFetch();
  }, [checkAdminAndFetch]);

  async function fetchTeams() {
    const { data } = await supabase.from('teams').select('id, name, tag').order('name');
    if (data) setTeams(data);
  }

  async function fetchEvents() {
    const { data } = await supabase.from('events').select('id, title').order('created_at', { ascending: false });
    if (data) setEvents(data);
  }

  async function fetchDisputedMatches() {
    setLoading(true);
    const { data, error } = await supabase
      .from('matches')
      .select('*, teams_a:team_a_id (name, tag), teams_b:team_b_id (name, tag), events:event_id (title)')
      .eq('status', 'disputed')
      .order('created_at', { ascending: false });

    if (error) console.error('Error fetching matches:', error);
    if (data) setMatches(data);
    setLoading(false);
  }

  const handleCreateMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamA || !teamB) { alert('Pick both teams.'); return; }
    if (teamA === teamB) { alert('A team cannot play against itself.'); return; }

    setCreating(true);
    const { error } = await supabase.from('matches').insert({
      team_a_id: teamA,
      team_b_id: teamB,
      event_id: eventId || null,
      status: 'pending',
    });

    if (error) {
      alert('Error creating match: ' + error.message);
    } else {
      alert('Match created! Captains can now see it in My Matches.');
      setShowMatchForm(false);
      setTeamA(''); setTeamB(''); setEventId('');
    }
    setCreating(false);
  };

  const resolveDispute = async (match: MatchRecord, side: 'team_a' | 'team_b') => {
    const winnerId = side === 'team_a' ? match.team_a_id : match.team_b_id;
    const { error } = await supabase
      .from('matches')
      .update({
        status: side === 'team_a' ? 'team_a_win' : 'team_b_win',
        winner_id: winnerId,
      })
      .eq('id', match.id);

    if (error) {
      alert('Error resolving dispute: ' + error.message);
    } else {
      alert('Dispute resolved. Winner recorded.');
      fetchDisputedMatches();
    }
  };

  if (!isAdmin) {
    return <div className="flex min-h-screen items-center justify-center bg-black text-green-400 gaming-font">VERIFYING ADMIN ACCESS...</div>;
  }

  return (
    <main className="min-h-screen pb-24">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 glass-panel border-b border-red-900/50">
        <div className="max-w-md mx-auto p-4 flex justify-between items-center">
          <h1 className="text-xl font-black text-red-500 gaming-font">ADMIN <span className="text-white">CONTROL</span></h1>
          <button onClick={() => router.push('/')} className="text-xs bg-gray-800 hover:bg-gray-700 px-3 py-1 rounded border border-gray-700">BACK</button>
        </div>
      </header>

      <div className="max-w-md mx-auto pt-24 px-4 space-y-6">

        {/* Match Creator */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-lg font-black text-white gaming-font">MATCH MAKER</h2>
            <button
              onClick={() => setShowMatchForm(!showMatchForm)}
              className="bg-green-500 hover:bg-green-400 text-black px-4 py-1.5 rounded font-black text-xs gaming-font tracking-wider shadow-[0_0_15px_rgba(57,255,20,0.4)]"
            >
              {showMatchForm ? 'CLOSE' : '+ NEW MATCH'}
            </button>
          </div>

          {showMatchForm && (
            <form onSubmit={handleCreateMatch} className="glass-panel p-4 rounded-xl border border-green-500/30 space-y-3">
              <div>
                <label className="block text-[10px] text-gray-400 mb-1 uppercase tracking-widest font-bold">Event (Optional)</label>
                <select value={eventId} onChange={(e) => setEventId(e.target.value)} className="w-full bg-black/80 border border-gray-700 p-2 rounded text-sm text-white focus:border-green-500 outline-none">
                  <option value="">Friendly Match (No Event)</option>
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>{ev.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-gray-400 mb-1 uppercase tracking-widest font-bold">Team A</label>
                <select value={teamA} onChange={(e) => setTeamA(e.target.value)} className="w-full bg-black/80 border border-gray-700 p-2 rounded text-sm text-white focus:border-green-500 outline-none">
                  <option value="">Select Team A</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>{t.name} [{t.tag}]</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-gray-400 mb-1 uppercase tracking-widest font-bold">Team B</label>
                <select value={teamB} onChange={(e) => setTeamB(e.target.value)} className="w-full bg-black/80 border border-gray-700 p-2 rounded text-sm text-white focus:border-green-500 outline-none">
                  <option value="">Select Team B</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>{t.name} [{t.tag}]</option>
                  ))}
                </select>
              </div>
              <button type="submit" disabled={creating} className="w-full bg-green-500 hover:bg-green-400 text-black py-2 rounded font-black text-sm gaming-font tracking-wider disabled:opacity-50">
                {creating ? 'CREATING...' : 'START MATCH'}
              </button>
            </form>
          )}
        </div>

        {/* Dispute Court */}
        <div>
          <h2 className="text-lg font-black text-white gaming-font mb-3">DISPUTE COURT</h2>

          {loading ? (
            <p className="text-center text-gray-400 text-sm">Loading disputes...</p>
          ) : matches.length === 0 ? (
            <div className="glass-panel p-8 rounded-xl text-center border border-gray-800">
              <p className="text-green-400 font-bold gaming-font">ALL CLEAR</p>
              <p className="text-gray-400 text-sm mt-2">No disputed matches waiting for your verdict.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {matches.map((match) => (
                <div key={match.id} className="glass-panel p-4 rounded-xl border border-red-500/30">
                  <p className="text-xs text-purple-400 mb-1">{match.events?.title || 'Friendly Match'}</p>
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-bold text-blue-400 text-sm">{match.teams_a?.name} [{match.teams_a?.tag}]</span>
                    <span className="text-gray-500 font-bold text-xs">VS</span>
                    <span className="font-bold text-red-400 text-sm">{match.teams_b?.name} [{match.teams_b?.tag}]</span>
                  </div>

                  {match.screenshot_url ? (
                    <a href={match.screenshot_url} target="_blank" rel="noopener noreferrer" className="block mb-3 rounded-lg overflow-hidden border border-gray-700">
                      <Image
                        src={match.screenshot_url}
                        alt="Match proof"
                        width={800}
                        height={160}
                        className="w-full h-40 object-cover hover:opacity-80 transition"
                      />
                    </a>
                  ) : (
                    <p className="text-xs text-yellow-500 mb-3">No screenshot submitted.</p>
                  )}

                  <div className="flex gap-2">
                    <button onClick={() => resolveDispute(match, 'team_a')} className="flex-1 bg-blue-600 hover:bg-blue-500 py-2 rounded font-bold text-xs">
                      AWARD {match.teams_a?.tag}
                    </button>
                    <button onClick={() => resolveDispute(match, 'team_b')} className="flex-1 bg-red-600 hover:bg-red-500 py-2 rounded font-bold text-xs">
                      AWARD {match.teams_b?.tag}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}