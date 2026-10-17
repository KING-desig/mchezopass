'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion';
import GameArtwork, { GAME_OPTIONS, getGameVisual } from '../components/GameArtwork';
import PlayerAvatar, { AVATAR_PRESETS, PresetAvatarArt, type AvatarPreset } from '../components/PlayerAvatar';
import { supabase } from '../../utils/supabase';

interface PlayerProfile {
  id: string;
  username: string;
  main_game: string;
  county: string;
  campus: string | null;
  is_admin?: boolean;
  avatar_url: string | null;
  avatar_preset: string | null;
}

interface Battle {
  id: string;
  winner_id: string | null;
  team_a_id: string;
  team_b_id: string;
  events?: { title: string } | null;
  teams_a?: { name: string } | null;
  teams_b?: { name: string } | null;
}

const GAMES = [...GAME_OPTIONS, 'eFootball'];
const COUNTIES = [
  'Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Kiambu', 'Machakos',
  'Kajiado', 'Uasin Gishu', 'Meru', 'Nyeri', 'Kakamega', 'Other',
];

function getTier(wins: number) {
  if (wins >= 10) return { name: 'LEGEND', color: '#c084fc', next: null };
  if (wins >= 6) return { name: 'GOLD', color: '#facc15', next: 10 };
  if (wins >= 3) return { name: 'SILVER', color: '#d1d5db', next: 6 };
  return { name: 'BRONZE', color: '#d99a5b', next: 3 };
}

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [trustScore, setTrustScore] = useState(0);
  const [totalRatings, setTotalRatings] = useState(0);
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [isCaptain, setIsCaptain] = useState(false);
  const [myTeamIds, setMyTeamIds] = useState<string[]>([]);
  const [history, setHistory] = useState<Battle[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [username, setUsername] = useState('');
  const [mainGame, setMainGame] = useState<string>(GAMES[0]);
  const [county, setCounty] = useState('Nairobi');
  const [campus, setCampus] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarPreset, setAvatarPreset] = useState<AvatarPreset>('rookie');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [error, setError] = useState('');
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const pointerActive = useMotionValue(0);
  const tiltX = useSpring(useTransform(pointerY, [-0.5, 0.5], [5, -5]), { stiffness: 180, damping: 22, mass: 0.35 });
  const tiltY = useSpring(useTransform(pointerX, [-0.5, 0.5], [-5, 5]), { stiffness: 180, damping: 22, mass: 0.35 });
  const highlightX = useTransform(pointerX, [-0.5, 0.5], ['0%', '100%']);
  const highlightY = useTransform(pointerY, [-0.5, 0.5], ['0%', '100%']);
  const highlight = useMotionTemplate`radial-gradient(circle at ${highlightX} ${highlightY}, rgba(255,255,255,.16), transparent 38%)`;
  const highlightOpacity = useSpring(pointerActive, { stiffness: 220, damping: 26 });

  const trackCardPointer = (event: React.PointerEvent<HTMLElement>) => {
    if (prefersReducedMotion || event.pointerType === 'touch') return;
    const bounds = event.currentTarget.getBoundingClientRect();
    pointerX.set((event.clientX - bounds.left) / bounds.width - 0.5);
    pointerY.set((event.clientY - bounds.top) / bounds.height - 0.5);
    pointerActive.set(1);
  };

  const resetCardPointer = () => {
    pointerX.set(0);
    pointerY.set(0);
    pointerActive.set(0);
  };

  const init = useCallback(async () => {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    if (authError) {
      setError(`Could not verify your session: ${authError.message}`);
      setLoading(false);
      return;
    }

    const { data: prof, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
    if (profileError) {
      setError(`Could not load your gamer profile: ${profileError.message}`);
      setLoading(false);
      return;
    }

    if (prof) {
      const playerProfile = prof as PlayerProfile;
      setProfile(playerProfile);
      setUsername(playerProfile.username || '');
      setMainGame(playerProfile.main_game || GAMES[0]);
      setCounty(playerProfile.county || 'Nairobi');
      setCampus(playerProfile.campus || '');
      setAvatarUrl(playerProfile.avatar_url || null);
      setAvatarPreset((playerProfile.avatar_preset as AvatarPreset) || 'rookie');
    } else {
      setProfile(null);
    }

    const [{ data: stats }, { data: matchStats }, { data: capt }, { data: memberships }] = await Promise.all([
      supabase.rpc('get_trust_score', { user_id: user.id }),
      supabase.rpc('get_player_stats', { p_user_id: user.id }),
      supabase.from('teams').select('id').eq('captain_id', user.id),
      supabase.from('team_members').select('team_id').eq('user_id', user.id),
    ]);

    if (stats?.length) {
      setTrustScore(stats[0].avg_score || 0);
      setTotalRatings(stats[0].total_ratings || 0);
    }
    if (matchStats?.length) {
      setWins(matchStats[0].wins || 0);
      setLosses(matchStats[0].losses || 0);
    }
    setIsCaptain(!!capt?.length);
    const teamIds = ((memberships || []) as { team_id: string }[]).map((membership) => membership.team_id);
    setMyTeamIds(teamIds);

    if (teamIds.length) {
      const { data: battles } = await supabase
        .from('matches')
        .select('id, winner_id, team_a_id, team_b_id, events(title), teams_a:team_a_id(name), teams_b:team_b_id(name)')
        .in('status', ['team_a_win', 'team_b_win'])
        .or(`team_a_id.in.(${teamIds.join(',')}),team_b_id.in.(${teamIds.join(',')})`)
        .order('updated_at', { ascending: false })
        .limit(5);
      if (battles) setHistory(battles as unknown as Battle[]);
    } else {
      setHistory([]);
    }
    setLoading(false);
  }, [router]);

  useEffect(() => {
    void Promise.resolve().then(init);
  }, [init]);

  useEffect(() => () => {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
  }, [avatarPreview]);

  const selectAvatarFile = (file: File | undefined) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Choose a JPG, PNG, or WebP image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Choose an image smaller than 5 MB.');
      return;
    }
    setError('');
    setAvatarPreview(URL.createObjectURL(file));
    setAvatarFile(file);
  };

  const saveProfile = async () => {
    const gamerTag = username.trim();
    if (!gamerTag) {
      setError('Choose a gamer tag before saving your card.');
      return;
    }

    setSaving(true);
    setError('');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      setError(authError?.message || 'Your session has expired. Sign in again to save your card.');
      setSaving(false);
      return;
    }

    let savedAvatarUrl = avatarUrl;
    let uploadedAvatarPath: string | null = null;
    if (avatarFile) {
      const extension = avatarFile.type === 'image/jpeg' ? 'jpg' : avatarFile.type === 'image/png' ? 'png' : 'webp';
      uploadedAvatarPath = `${user.id}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from('player-avatars')
        .upload(uploadedAvatarPath, avatarFile, { contentType: avatarFile.type, cacheControl: '3600' });
      if (uploadError) {
        const message = uploadError.message.toLowerCase().includes('bucket not found')
          ? 'Avatar storage is not set up yet. Ask the project administrator to apply supabase/migrations/20261017000100_player_avatars.sql in the Supabase SQL Editor, then try again.'
          : `Could not upload your profile picture: ${uploadError.message}`;
        setError(message);
        setSaving(false);
        return;
      }
      savedAvatarUrl = supabase.storage.from('player-avatars').getPublicUrl(uploadedAvatarPath).data.publicUrl;
    }

    const { data, error: saveError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        username: gamerTag,
        main_game: mainGame,
        county,
        campus: campus.trim() || null,
        avatar_url: savedAvatarUrl,
        avatar_preset: avatarPreset,
      }, { onConflict: 'id' })
      .select('*')
      .single();

    if (saveError) {
      if (uploadedAvatarPath) {
        const { error: cleanupError } = await supabase.storage.from('player-avatars').remove([uploadedAvatarPath]);
        if (cleanupError) console.error('Could not clean up the unlinked profile picture:', cleanupError.message);
      }
      setError(`Could not save your gamer card: ${saveError.message}`);
      setSaving(false);
      return;
    }

    const previousAvatarUrl = profile?.avatar_url;
    setProfile(data as PlayerProfile);
    setUsername(gamerTag);
    setAvatarUrl(savedAvatarUrl);
    setAvatarFile(null);
    setAvatarPreview(null);
    setEditMode(false);
    setSaving(false);

    if (previousAvatarUrl && previousAvatarUrl !== savedAvatarUrl) {
      const marker = '/storage/v1/object/public/player-avatars/';
      const avatarPath = previousAvatarUrl.includes(marker)
        ? decodeURIComponent(previousAvatarUrl.split(marker)[1].split('?')[0])
        : '';
      if (avatarPath.startsWith(`${user.id}/`)) {
        const { error: cleanupError } = await supabase.storage.from('player-avatars').remove([avatarPath]);
        if (cleanupError) console.error('Could not remove the previous profile picture:', cleanupError.message);
      }
    }
  };

  if (loading) {
    return (
      <main className="game-world flex min-h-screen items-center justify-center bg-[#050807] text-green-300">
        <div className="text-center">
          <div className="mx-auto mb-3 h-9 w-9 animate-spin rounded-full border-2 border-green-400 border-t-transparent" />
          <p className="gaming-font text-[10px] tracking-[0.25em]">LOADING PLAYER DATA</p>
        </div>
      </main>
    );
  }

  const visual = getGameVisual(mainGame);
  const tier = getTier(wins);
  const profileComplete = !!profile;
  const badges = [
    isCaptain && { icon: '⬡', label: 'SQUAD CAPTAIN' },
    totalRatings >= 5 && trustScore >= 4 && { icon: '✦', label: 'TRUSTED PLAYER' },
    wins >= 1 && { icon: '♛', label: 'FIRST VICTORY' },
    profile?.is_admin && { icon: '✪', label: 'ADMIN' },
  ].filter(Boolean) as { icon: string; label: string }[];
  const tierProgress = tier.next ? Math.min(100, (wins / tier.next) * 100) : 100;

  return (
    <main className="game-world min-h-screen overflow-x-hidden bg-[#050807] pb-12 text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#07100ddd] backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <button onClick={() => router.push('/')} className="flex items-center gap-2 text-left">
            <span className="grid h-9 w-9 place-items-center border border-green-400/40 bg-green-400/10 font-black text-green-300">MP</span>
            <span className="gaming-font text-xs font-black tracking-[0.18em]">MCHEZO<span className="text-green-400">PASS</span></span>
          </button>
          <div className="flex items-center gap-3">
            <span className="hidden text-[9px] font-bold tracking-[0.2em] text-gray-500 sm:block">PLAYER PROFILE / 01</span>
            <button onClick={() => router.push('/')} className="border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-bold tracking-widest text-gray-300 transition hover:border-green-400/50 hover:text-green-300">
              BACK TO HUB
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-[9px] font-black tracking-[0.35em] text-green-400">YOUR IDENTITY IN THE ARENA</p>
            <h1 className="gaming-font text-2xl font-black tracking-wide sm:text-4xl">PLAYER <span className="text-green-400">CARD</span></h1>
          </div>
          {profileComplete && (
            <button
              onClick={() => { setError(''); setEditMode(!editMode); }}
              className="border border-green-400/30 bg-green-400/10 px-3 py-2 text-[10px] font-black tracking-wider text-green-300 transition hover:bg-green-400 hover:text-black sm:px-4"
            >
              {editMode ? 'CANCEL EDIT' : 'EDIT CARD'}
            </button>
          )}
        </div>

        {error && (
          <div role="alert" className="mb-5 border border-red-400/30 bg-red-950/40 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {!profileComplete || editMode ? (
          <div className="grid gap-5 lg:grid-cols-[1fr_0.8fr]">
            <section className="relative min-h-64 overflow-hidden border border-white/10 bg-[#0b1110] p-5 sm:p-7">
              <GameArtwork game={mainGame} />
              <div className="relative z-10 max-w-md pt-20">
                <p className="text-[9px] font-black tracking-[0.28em] text-green-300">PLAYER SETUP / 01</p>
                <h2 className="gaming-font mt-2 text-2xl font-black sm:text-3xl">{profileComplete ? 'REFINE YOUR CARD' : 'BUILD YOUR PLAYER ID'}</h2>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-gray-300">
                  Set your gamer tag and main game. This is how Kenya’s gaming community will know you.
                </p>
                <div className="mt-5 flex items-center gap-3 border-t border-white/10 pt-4">
                  <PlayerAvatar
                    username={username || 'Player'}
                    avatarUrl={avatarPreview || avatarUrl}
                    avatarPreset={avatarPreset}
                    className="h-12 w-12 border-2 border-green-300/70 text-xl shadow-[0_0_22px_rgba(57,255,20,.18)]"
                  />
                  <div>
                    <p className="gaming-font text-sm font-black">{username.trim() || 'YOUR GAMER TAG'}</p>
                    <p className="text-[10px] font-bold tracking-widest text-gray-400">{mainGame.toUpperCase()}</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="border border-white/10 bg-[#0a100f]/90 p-5 sm:p-6">
              <div className="mb-5 flex items-center gap-2">
                <span className="h-1 w-6 bg-green-400" />
                <h2 className="gaming-font text-xs font-black tracking-[0.18em]">PLAYER DETAILS</h2>
              </div>
              <div className="space-y-4">
                <label className="block">
                  <span className="mb-2 block text-[9px] font-black tracking-[0.2em] text-gray-400">GAMER TAG</span>
                  <input maxLength={24} value={username} onChange={(event) => setUsername(event.target.value)} placeholder="e.g. NAIROBI_SNIPER" className="w-full border border-white/10 bg-black/60 px-3 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-green-400/70" />
                </label>
                <label className="block">
                  <span className="mb-2 block text-[9px] font-black tracking-[0.2em] text-gray-400">MAIN GAME</span>
                  <select value={mainGame} onChange={(event) => setMainGame(event.target.value)} className="w-full border border-white/10 bg-black/60 px-3 py-3 text-sm text-white outline-none focus:border-green-400/70">
                    {GAMES.map((game) => <option key={game}>{game}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-2 block text-[9px] font-black tracking-[0.2em] text-gray-400">COUNTY</span>
                  <select value={county} onChange={(event) => setCounty(event.target.value)} className="w-full border border-white/10 bg-black/60 px-3 py-3 text-sm text-white outline-none focus:border-green-400/70">
                    {COUNTIES.map((item) => <option key={item}>{item}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-2 block text-[9px] font-black tracking-[0.2em] text-gray-400">CAMPUS / AREA <span className="text-gray-600">OPTIONAL</span></span>
                  <input maxLength={60} value={campus} onChange={(event) => setCampus(event.target.value)} placeholder="e.g. KU Main Campus" className="w-full border border-white/10 bg-black/60 px-3 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-green-400/70" />
                </label>
                <div>
                  <p className="mb-2 text-[9px] font-black tracking-[0.2em] text-gray-400">PLAYER PICTURE</p>
                  <label className="flex cursor-pointer items-center justify-center gap-2 border border-dashed border-green-300/30 bg-green-300/[0.04] px-3 py-3 text-xs font-bold text-green-200 transition hover:border-green-300/70 hover:bg-green-300/[0.08]">
                    <span aria-hidden="true">↑</span>
                    Upload photo <span className="text-[10px] text-gray-500">JPG, PNG or WebP · max 5 MB</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      onChange={(event) => {
                        selectAvatarFile(event.target.files?.[0]);
                        event.currentTarget.value = '';
                      }}
                    />
                  </label>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {AVATAR_PRESETS.map((preset) => (
                      <motion.button
                        key={preset.id}
                        type="button"
                        aria-label={`Choose ${preset.label} avatar`}
                        aria-pressed={!avatarPreview && !avatarUrl && avatarPreset === preset.id}
                        onClick={() => {
                          setAvatarFile(null);
                          setAvatarPreview(null);
                          setAvatarUrl(null);
                          setAvatarPreset(preset.id);
                        }}
                        whileHover={prefersReducedMotion ? undefined : { y: -3, scale: 1.04 }}
                        whileTap={prefersReducedMotion ? undefined : { scale: 0.97 }}
                        animate={!avatarPreview && !avatarUrl && avatarPreset === preset.id ? { scale: 1.02 } : { scale: 1 }}
                        className={`group relative flex min-h-[76px] items-center gap-2 overflow-hidden border px-2 text-left transition-colors ${!avatarPreview && !avatarUrl && avatarPreset === preset.id ? 'border-green-300/70 bg-green-300/10 shadow-[0_0_18px_rgba(57,255,20,.13)]' : 'border-white/10 bg-black/40 hover:border-white/30 hover:bg-white/[0.04]'}`}
                        title={`${preset.label} avatar`}
                      >
                        <span className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: `radial-gradient(circle at 20% 50%, ${preset.glow}22, transparent 65%)` }} />
                        <span className="relative h-14 w-14 shrink-0 transition-transform duration-300 group-hover:rotate-3">
                          <PresetAvatarArt preset={preset.id} className="h-full w-full" />
                        </span>
                        <span className="relative min-w-0">
                          <span className="block truncate gaming-font text-[9px] font-black tracking-wider">{preset.label}</span>
                          <span className={`mt-1 block text-[7px] font-bold tracking-[0.12em] ${!avatarPreview && !avatarUrl && avatarPreset === preset.id ? 'text-green-300' : 'text-gray-500'}`}>
                            {!avatarPreview && !avatarUrl && avatarPreset === preset.id ? 'EQUIPPED' : 'SELECT'}
                          </span>
                        </span>
                      </motion.button>
                    ))}
                  </div>
                  {avatarPreview && (
                    <button type="button" onClick={() => { setAvatarFile(null); setAvatarPreview(null); setAvatarUrl(null); }} className="mt-2 text-[10px] font-bold text-gray-400 underline hover:text-white">
                      Remove uploaded photo
                    </button>
                  )}
                </div>
                <motion.button onClick={saveProfile} disabled={saving || !username.trim()} whileTap={{ scale: 0.98 }} className="w-full bg-green-400 py-3 text-xs font-black tracking-[0.18em] text-black transition hover:bg-green-300 disabled:cursor-not-allowed disabled:opacity-50">
                  {saving ? 'SAVING PLAYER CARD...' : profileComplete ? 'SAVE PLAYER CARD' : 'CREATE MY PLAYER CARD'}
                </motion.button>
              </div>
            </section>
          </div>
        ) : (
          <>
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              onPointerMove={trackCardPointer}
              onPointerLeave={resetCardPointer}
              style={{
                rotateX: prefersReducedMotion ? 0 : tiltX,
                rotateY: prefersReducedMotion ? 0 : tiltY,
                transformPerspective: 1200,
                transformStyle: 'preserve-3d',
              }}
              className="relative overflow-hidden border border-white/10 bg-[#0a100f] shadow-2xl transition-[border-color,box-shadow] duration-300 hover:border-green-300/30 hover:shadow-[0_24px_70px_rgba(0,0,0,.45),0_0_32px_rgba(57,255,20,.08)]"
            >
              <div className="relative h-48 overflow-hidden sm:h-64">
                <GameArtwork game={profile.main_game} />
                <div className="absolute inset-0 z-[1] bg-gradient-to-t from-[#080c0b] via-black/10 to-black/20" />
                <motion.div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 z-[2]"
                  style={{
                    background: highlight,
                    opacity: prefersReducedMotion ? 0 : highlightOpacity,
                  }}
                />
                <span className="absolute right-4 top-4 z-[3] border border-white/20 bg-black/50 px-3 py-1.5 text-[9px] font-black tracking-[0.2em]" style={{ color: visual.accent }}>
                  {visual.label}
                </span>
                <span className="absolute left-4 top-4 z-[3] border border-white/15 bg-black/50 px-3 py-1.5 text-[9px] font-black tracking-[0.2em]" style={{ color: tier.color }}>
                  {tier.name} DIVISION
                </span>
                <div className="absolute bottom-3 right-4 z-[3] gaming-font text-[9px] font-bold tracking-[0.22em] text-white/60">MP PLAYER / VERIFIED ID</div>
              </div>

              <div className="relative z-[2] -mt-10 px-4 pb-5 sm:px-7 sm:pb-7">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div className="flex min-w-0 items-end gap-4">
                    <PlayerAvatar
                      username={profile.username}
                      avatarUrl={profile.avatar_url}
                      avatarPreset={profile.avatar_preset}
                      className="h-20 w-20 border-4 border-[#0a100f] text-3xl shadow-[0_0_28px_rgba(57,255,20,.28)] sm:h-24 sm:w-24"
                    />
                    <div className="min-w-0 pb-1">
                      <p className="text-[9px] font-black tracking-[0.24em] text-green-300">PLAYER / {profile.county?.toUpperCase() || 'KENYA'}</p>
                      <h2 className="gaming-font mt-1 truncate text-xl font-black sm:text-3xl">{profile.username}</h2>
                      <p className="mt-1 truncate text-xs text-gray-400">{profile.campus ? `${profile.campus} · ` : ''}{profile.main_game}</p>
                    </div>
                  </div>
                  <div className="border-l-2 pl-4" style={{ borderColor: visual.accent }}>
                    <p className="text-[8px] font-black tracking-[0.2em] text-gray-500">CURRENT DIVISION</p>
                    <p className="gaming-font mt-1 text-lg font-black" style={{ color: tier.color }}>{tier.name}</p>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-px border border-white/10 bg-white/10 sm:grid-cols-4">
                  <div className="bg-[#0a100f] p-3 sm:p-4">
                    <p className="text-[8px] font-black tracking-[0.2em] text-gray-500">TRUST RATING</p>
                    <p className="gaming-font mt-2 text-xl font-black text-green-300">{trustScore > 0 ? trustScore.toFixed(1) : '—'}<span className="ml-1 text-[10px] text-gray-500">/ 5</span></p>
                  </div>
                  <div className="bg-[#0a100f] p-3 sm:p-4">
                    <p className="text-[8px] font-black tracking-[0.2em] text-gray-500">BATTLE RECORD</p>
                    <p className="gaming-font mt-2 text-xl font-black"><span className="text-green-300">{wins}W</span><span className="mx-1 text-gray-600">/</span><span className="text-red-300">{losses}L</span></p>
                  </div>
                  <div className="bg-[#0a100f] p-3 sm:p-4">
                    <p className="text-[8px] font-black tracking-[0.2em] text-gray-500">PLAYER STATUS</p>
                    <p className="gaming-font mt-2 text-sm font-black text-white">{totalRatings >= 5 ? 'TRUSTED' : totalRatings ? 'ACTIVE' : 'ROOKIE'}</p>
                  </div>
                  <div className="bg-[#0a100f] p-3 sm:p-4">
                    <p className="text-[8px] font-black tracking-[0.2em] text-gray-500">NEXT DIVISION</p>
                    <p className="gaming-font mt-2 text-sm font-black" style={{ color: tier.color }}>{tier.next ? `${Math.max(0, tier.next - wins)} WINS` : 'MAX TIER'}</p>
                  </div>
                </div>
                <div className="mt-3 h-1 overflow-hidden bg-white/10">
                  <div className="h-full transition-all" style={{ width: `${tierProgress}%`, backgroundColor: tier.color }} />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {badges.length ? badges.map((badge) => (
                    <span key={badge.label} className="border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[8px] font-black tracking-[0.14em] text-gray-200">
                      <span className="mr-1 text-green-300">{badge.icon}</span>{badge.label}
                    </span>
                  )) : (
                    <span className="text-[10px] text-gray-500">Your first achievement is waiting in the arena.</span>
                  )}
                </div>
              </div>
            </motion.section>

            <section className="mt-5 border border-white/10 bg-[#0a100f]/90 p-4 sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-black tracking-[0.25em] text-green-300">RECENT RESULTS</p>
                  <h3 className="gaming-font mt-1 text-sm font-black">BATTLE HISTORY</h3>
                </div>
                <span className="border border-white/10 px-2 py-1 text-[8px] font-bold tracking-widest text-gray-500">LAST 5</span>
              </div>
              {history.length === 0 ? (
                <div className="border border-dashed border-white/10 px-4 py-8 text-center">
                  <p className="text-2xl">⚔</p>
                  <p className="gaming-font mt-2 text-[10px] font-bold tracking-widest text-gray-300">YOUR LEGEND STARTS HERE</p>
                  <p className="mt-1 text-xs text-gray-500">Join a squad and play your first battle.</p>
                  <button onClick={() => router.push('/teams')} className="mt-4 border border-green-400/30 px-4 py-2 text-[9px] font-black tracking-widest text-green-300 hover:bg-green-400 hover:text-black">FIND A SQUAD</button>
                </div>
              ) : (
                <div className="divide-y divide-white/10">
                  {history.map((battle) => {
                    const teamA = myTeamIds.includes(battle.team_a_id);
                    const won = battle.winner_id === (teamA ? battle.team_a_id : battle.team_b_id);
                    const opponent = teamA ? battle.teams_b?.name : battle.teams_a?.name;
                    return (
                      <div key={battle.id} className="flex items-center justify-between gap-4 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold">vs {opponent || 'Unknown squad'}</p>
                          <p className="mt-1 truncate text-[10px] text-gray-500">{battle.events?.title || 'Friendly match'}</p>
                        </div>
                        <span className={`gaming-font text-xs font-black ${won ? 'text-green-300' : 'text-red-300'}`}>{won ? 'VICTORY' : 'DEFEAT'}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
