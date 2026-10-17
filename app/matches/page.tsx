'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { supabase } from '../../utils/supabase';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

interface TeamSummary {
  name: string;
  tag: string;
}

interface MatchRecord {
  id: string;
  status: string;
  team_a_id: string;
  team_b_id: string;
  winner_id?: string | null;
  screenshot_url?: string | null;
  teams_a?: TeamSummary | null;
  teams_b?: TeamSummary | null;
  events?: { title: string } | null;
}

export default function MatchesPage() {
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [myTeamIds, setMyTeamIds] = useState<string[]>([]);

  const [activeMatch, setActiveMatch] = useState<MatchRecord | null>(null);
  const [actionType, setActionType] = useState('');
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const router = useRouter();

  const fetchMatches = useCallback(async (teamIds: string[]) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('matches')
      .select(`*, teams_a:team_a_id (name, tag), teams_b:team_b_id (name, tag), events:event_id (title)`)
      .or(`team_a_id.in.(${teamIds.join(',')}),team_b_id.in.(${teamIds.join(',')})`)
      .order('created_at', { ascending: false });
    if (error) console.error('Error fetching matches:', error);
    if (data) setMatches(data);
    setLoading(false);
  }, []);

  const init = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }

    const { data: memberships } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', user.id);

    const teamIds = memberships?.map((m: { team_id: string }) => m.team_id) ?? [];
    setMyTeamIds(teamIds);

    if (teamIds.length > 0) {
      await fetchMatches(teamIds);
    } else {
      setLoading(false);
    }
  }, [fetchMatches, router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void init();
  }, [init]);

  const getMyTeamIdInMatch = (match: MatchRecord) => {
    if (myTeamIds.includes(match.team_a_id)) return match.team_a_id;
    if (myTeamIds.includes(match.team_b_id)) return match.team_b_id;
    return null;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setScreenshotFile(e.target.files[0]);
  };

  const submitResult = async () => {
    if (!activeMatch) return;
    setUploading(true);
    let screenshotUrl = activeMatch.screenshot_url;
    const myTeamId = getMyTeamIdInMatch(activeMatch);

    if (screenshotFile && actionType === 'claim_win') {
      const fileExt = screenshotFile.name.split('.').pop();
      const fileName = `${activeMatch.id}_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('match-screenshots')
        .upload(fileName, screenshotFile);

      if (uploadError) {
        alert('Error uploading screenshot: ' + uploadError.message);
        setUploading(false);
        return;
      }
      const { data: urlData } = supabase.storage.from('match-screenshots').getPublicUrl(fileName);
      screenshotUrl = urlData.publicUrl;
    }

    const update: Record<string, string | null> = { screenshot_url: screenshotUrl ?? null };

    if (actionType === 'claim_win') {
      update.status = 'awaiting_confirmation';
      update.winner_id = myTeamId;
    } else if (actionType === 'confirm') {
      update.status = activeMatch.winner_id === activeMatch.team_a_id ? 'team_a_win' : 'team_b_win';
    } else if (actionType === 'dispute') {
      update.status = 'disputed';
    }

    const { error: updateError } = await supabase
      .from('matches')
      .update(update)
      .eq('id', activeMatch.id);

    if (updateError) {
      alert('Error updating match: ' + updateError.message);
    } else {
      alert('Match updated successfully!');
      setActiveMatch(null);
      setScreenshotFile(null);
      fetchMatches(myTeamIds);
    }
    setUploading(false);
  };

  const statusTheme = (status: string) => {
    switch (status) {
      case 'pending':
        return { badge: 'bg-gray-800 text-gray-300 border border-gray-600', card: 'border-gray-700', label: 'WAITING FOR CLAIM' };
      case 'awaiting_confirmation':
        return { badge: 'bg-yellow-900/40 text-yellow-400 border border-yellow-600/50', card: 'border-yellow-500/40', label: 'AWAITING CONFIRMATION' };
      case 'disputed':
        return { badge: 'bg-red-900/40 text-red-400 border border-red-600/50', card: 'border-red-500/40', label: 'DISPUTED - ADMIN REVIEW' };
      default:
        return { badge: 'bg-green-900/40 text-green-400 border border-green-600/50', card: 'border-green-500/40', label: 'FINAL RESULT' };
    }
  };

  return (
    <main className="min-h-screen pb-24">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 glass-panel border-b border-green-900/50">
        <div className="max-w-md mx-auto p-4 flex justify-between items-center">
          <h1 className="text-xl font-black neon-text-green">BATTLE <span className="text-white">LOG</span></h1>
          <button onClick={() => router.push('/')} className="text-xs bg-gray-800 hover:bg-gray-700 px-3 py-1 rounded border border-gray-700">BACK</button>
        </div>
      </header>

      <div className="max-w-md mx-auto pt-24 px-4 space-y-4">
        {loading ? (
          <div className="flex justify-center mt-10"><div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div></div>
        ) : myTeamIds.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-8 rounded-xl text-center border border-gray-800">
            <p className="text-gray-300 mb-3 gaming-font">NO SQUAD DETECTED</p>
            <button onClick={() => router.push('/teams')} className="bg-green-500 hover:bg-green-400 text-black px-4 py-2 rounded font-black text-sm gaming-font">CREATE OR JOIN A TEAM</button>
          </motion.div>
        ) : matches.length === 0 ? (
          <div className="glass-panel p-8 rounded-xl text-center border border-gray-800">
            <p className="text-gray-400 text-sm gaming-font">NO BATTLES SCHEDULED</p>
          </div>
        ) : (
          matches.map((match, index) => {
            const isTeamA = myTeamIds.includes(match.team_a_id);
            const isTeamB = myTeamIds.includes(match.team_b_id);
            const myTeamId = isTeamA ? match.team_a_id : isTeamB ? match.team_b_id : null;
            const iClaimed = match.winner_id === myTeamId;
            const theme = statusTheme(match.status);
            const claimerName = match.winner_id === match.team_a_id ? match.teams_a?.name : match.teams_b?.name;

            return (
              <motion.div
                key={match.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
                whileHover={{ y: -4 }}
                className={`glass-panel rounded-xl p-4 border ${theme.card}`}
              >
                <div className="flex justify-between items-center mb-3">
                  <p className="text-[10px] text-purple-400 font-black gaming-font tracking-widest">{match.events?.title || 'FRIENDLY SCRIM'}</p>
                  <span className={`text-[9px] px-2 py-0.5 rounded font-black gaming-font ${theme.badge}`}>{theme.label}</span>
                </div>

                <div className="flex justify-between items-center mb-3">
                  <div className={`text-sm font-black gaming-font ${isTeamA ? 'text-green-400' : 'text-white'}`}>
                    {match.teams_a?.name} <span className="text-gray-500">[{match.teams_a?.tag}]</span>
                  </div>
                  <span className="text-gray-600 font-black text-xs gaming-font">VS</span>
                  <div className={`text-sm font-black gaming-font ${isTeamB ? 'text-green-400' : 'text-white'}`}>
                    {match.teams_b?.name} <span className="text-gray-500">[{match.teams_b?.tag}]</span>
                  </div>
                </div>

                {match.status === 'awaiting_confirmation' && (
                  <p className="text-[10px] text-yellow-500 mb-2 font-bold">📸 Proof submitted by {claimerName} — opponent reviewing</p>
                )}

                <div className="flex gap-2 mt-2">
                  {match.status === 'pending' && (isTeamA || isTeamB) && (
                    <motion.button whileTap={{ scale: 0.95 }} onClick={() => { setActiveMatch(match); setActionType('claim_win'); }} className="flex-1 bg-green-500 hover:bg-green-400 text-black py-2 rounded font-black text-xs gaming-font tracking-wider shadow-[0_0_12px_rgba(57,255,20,0.35)]">
                      📸 CLAIM WIN
                    </motion.button>
                  )}

                  {match.status === 'awaiting_confirmation' && !iClaimed && (isTeamA || isTeamB) && (
                    <>
                      <motion.button whileTap={{ scale: 0.95 }} onClick={() => { setActiveMatch(match); setActionType('confirm'); }} className="flex-1 bg-green-600 hover:bg-green-500 py-2 rounded font-black text-xs gaming-font">
                        ✅ CONFIRM
                      </motion.button>
                      <motion.button whileTap={{ scale: 0.95 }} onClick={() => { setActiveMatch(match); setActionType('dispute'); }} className="flex-1 bg-red-600 hover:bg-red-500 py-2 rounded font-black text-xs gaming-font">
                        ⚠️ DISPUTE
                      </motion.button>
                    </>
                  )}

                  {match.status === 'awaiting_confirmation' && iClaimed && (
                    <p className="text-xs text-yellow-500 italic w-full text-center py-2">Waiting for opponent to review your proof...</p>
                  )}

                  {match.status === 'disputed' && (
                    <p className="text-xs text-red-400 italic w-full text-center py-2">⚠️ Disputed — Admin is reviewing</p>
                  )}

                  {(match.status === 'team_a_win' || match.status === 'team_b_win') && (
                    <p className="text-xs text-green-400 font-black w-full text-center py-2 gaming-font">
                      🏆 WINNER: {match.status === 'team_a_win' ? match.teams_a?.name : match.teams_b?.name}
                    </p>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Action Modal */}
      <AnimatePresence>
        {activeMatch && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="glass-panel p-6 rounded-xl w-full max-w-md border border-green-500/30 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-black mb-4 gaming-font text-white">
                {actionType === 'claim_win' ? 'UPLOAD MATCH PROOF' :
                 actionType === 'confirm' ? `CONFIRM ${activeMatch.winner_id === activeMatch.team_a_id ? activeMatch.teams_a?.name : activeMatch.teams_b?.name} WIN?` :
                 'REPORT A DISPUTE'}
              </h3>

              {actionType === 'claim_win' && (
                <div className="mb-4">
                  <label className="block text-[10px] text-gray-400 mb-1 uppercase tracking-widest font-bold">Screenshot of Victory</label>
                  <input type="file" accept="image/*" onChange={handleFileChange} className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-black file:bg-green-900 file:text-green-300 hover:file:bg-green-800" />
                </div>
              )}

              {(actionType === 'confirm' || actionType === 'dispute') && activeMatch.screenshot_url && (
                <div className="mb-4">
                  <label className="block text-[10px] text-gray-400 mb-1 uppercase tracking-widest font-bold">Opponent proof</label>
                  <Image src={activeMatch.screenshot_url} alt="Match proof" width={800} height={160} className="w-full h-40 object-cover rounded-lg border border-gray-700" />
                </div>
              )}

              <p className="text-sm text-gray-300 mb-6">
                {actionType === 'claim_win' && "Upload a clear screenshot of the final score. The opponent will review it."}
                {actionType === 'confirm' && "By confirming, you agree the claimed team won this match fairly."}
                {actionType === 'dispute' && "This will send the match and the proof to the Admin for review."}
              </p>

              <div className="flex gap-3">
                <button onClick={() => setActiveMatch(null)} className="flex-1 bg-gray-800 hover:bg-gray-700 py-2 rounded font-bold text-sm border border-gray-700">CANCEL</button>
                <button onClick={submitResult} disabled={uploading} className="flex-1 bg-green-500 hover:bg-green-400 text-black py-2 rounded font-black text-sm gaming-font disabled:opacity-50">
                  {uploading ? 'PROCESSING...' : 'SUBMIT'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}