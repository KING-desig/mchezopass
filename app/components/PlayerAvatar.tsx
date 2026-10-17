const PRESET_AVATARS = {
  rookie: { label: 'Rookie', title: 'THE ROOKIE', colors: ['#52ff9a', '#075e3a'], glow: '#52ff9a' },
  striker: { label: 'Striker', title: 'THE STRIKER', colors: ['#ffc15a', '#78350f'], glow: '#ffc15a' },
  phantom: { label: 'Phantom', title: 'THE PHANTOM', colors: ['#b8a2ff', '#312e81'], glow: '#b8a2ff' },
  guardian: { label: 'Guardian', title: 'THE GUARDIAN', colors: ['#70eaff', '#164e63'], glow: '#70eaff' },
  champion: { label: 'Champion', title: 'THE CHAMPION', colors: ['#ffe36e', '#854d0e'], glow: '#ffe36e' },
  flame: { label: 'Flame', title: 'THE FLAME', colors: ['#ff8b72', '#9f1239'], glow: '#ff8b72' },
} as const;

export type AvatarPreset = keyof typeof PRESET_AVATARS;
export const AVATAR_PRESETS = Object.entries(PRESET_AVATARS).map(([id, avatar]) => ({
  id: id as AvatarPreset,
  ...avatar,
}));

interface PresetAvatarArtProps {
  preset: AvatarPreset;
  className?: string;
}

export function PresetAvatarArt({ preset, className = '' }: PresetAvatarArtProps) {
  const colors = PRESET_AVATARS[preset].colors;

  return (
    <svg viewBox="0 0 100 100" fill="none" aria-hidden="true" className={`player-avatar__art ${className}`}>
      <circle cx="50" cy="50" r="48" fill="#080d0b" stroke={colors[0]} strokeWidth="2.5" />
      <circle cx="50" cy="50" r="42" fill={colors[1]} fillOpacity=".45" />
      <circle className="player-avatar__orbit" cx="50" cy="50" r="38" stroke={colors[0]} strokeOpacity=".8" strokeWidth="1.5" strokeDasharray="3 5" />
      {preset === 'rookie' && (
        <g stroke={colors[0]} strokeLinejoin="round" strokeWidth="4">
          <path d="M24 38c2-8 8-12 16-13h20c8 1 14 5 16 13l5 22c2 9-5 14-12 9L57 59H43L31 69c-7 5-14 0-12-9l5-22Z" fill="#08130e" />
          <path d="M34 40v13m-6-6h12m26-5h.1m7 8h.1" strokeLinecap="round" />
          <path d="M42 35h16" stroke={colors[0]} strokeLinecap="round" opacity=".75" />
        </g>
      )}
      {preset === 'striker' && (
        <g stroke={colors[0]} strokeLinejoin="round" strokeWidth="3.5">
          <path d="m56 12-31 43h20l-2 32 33-46H56l7-29Z" fill={colors[1]} />
          <path d="m55 22-20 28h17l-1 22 17-27H52l3-23Z" fill={colors[0]} stroke="none" />
          <path d="M19 24h12M69 78h12" stroke={colors[0]} strokeLinecap="round" opacity=".7" />
        </g>
      )}
      {preset === 'phantom' && (
        <g stroke={colors[0]} strokeLinejoin="round" strokeWidth="3">
          <path d="M50 17c-17 0-29 13-29 31v22l12-6 9 12 8-8 8 8 9-12 12 6V48c0-18-12-31-29-31Z" fill={colors[1]} />
          <path d="m28 47 17 4-8 8-10-2 1-10Zm44 0-17 4 8 8 10-2-1-10Z" fill={colors[0]} />
          <path d="m43 64 7-6 7 6-7 7-7-7Z" fill="#10101c" />
          <path d="M38 30h24" stroke={colors[0]} strokeLinecap="round" opacity=".7" />
        </g>
      )}
      {preset === 'guardian' && (
        <g stroke={colors[0]} strokeLinejoin="round" strokeWidth="3.5">
          <path d="M50 13 78 25v21c0 19-12 32-28 41C34 78 22 65 22 46V25l28-12Z" fill={colors[1]} />
          <path d="m50 27 15 7v12c0 12-6 21-15 28-9-7-15-16-15-28V34l15-7Z" fill="#08141a" />
          <path d="m39 47 11-7 11 7-11 12-11-12Z" fill={colors[0]} />
          <circle cx="50" cy="48" r="3" fill="#fff" stroke="none" />
        </g>
      )}
      {preset === 'champion' && (
        <g stroke={colors[0]} strokeLinejoin="round" strokeWidth="3.5">
          <path d="m20 35 18 13 12-26 12 26 18-13-7 35H27l-7-35Z" fill={colors[1]} />
          <path d="m28 41 11 8 11-21 11 21 11-8-4 21H32l-4-21Z" fill={colors[0]} stroke="none" />
          <path d="M30 78h40M37 87h26" stroke={colors[0]} strokeLinecap="round" />
          <path d="m50 8 3 7 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1 3-7Z" fill={colors[0]} stroke="none" />
        </g>
      )}
      {preset === 'flame' && (
        <g stroke={colors[0]} strokeLinejoin="round" strokeWidth="3.5">
          <path d="M53 12c5 19-9 23-2 35 4-8 10-12 15-21 12 14 17 25 12 39-5 14-16 21-29 21S25 79 20 66c-6-17 5-32 18-47-1 13 0 20 6 25 7-8 12-17 9-32Z" fill={colors[1]} />
          <path d="M51 48c2 8-6 11-2 18 2-4 5-6 7-9 6 7 8 12 5 18-2 6-7 9-12 9s-10-3-12-9c-3-7 1-13 7-20 0 6 2 8 4 10 3-4 4-9 3-17Z" fill={colors[0]} stroke="none" />
        </g>
      )}
      <path d="M15 50a35 35 0 0 1 3-14m64 28a35 35 0 0 1-3 7" stroke={colors[0]} strokeLinecap="round" strokeWidth="2.5" opacity=".95" />
    </svg>
  );
}

interface PlayerAvatarProps {
  username: string;
  avatarUrl?: string | null;
  avatarPreset?: string | null;
  className?: string;
}

export default function PlayerAvatar({
  username,
  avatarUrl,
  avatarPreset,
  className = '',
}: PlayerAvatarProps) {
  const selectedPreset = avatarPreset && avatarPreset in PRESET_AVATARS
    ? avatarPreset as AvatarPreset
    : 'rookie';
  const preset = PRESET_AVATARS[selectedPreset];

  return (
    <span
      role="img"
      aria-label={`${username || 'Player'} avatar`}
      className={`player-avatar relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full ${className}`}
      style={{
        background: `radial-gradient(circle at 32% 20%, ${preset.colors[0]}, ${preset.colors[1]} 78%)`,
        boxShadow: `0 0 18px ${preset.glow}38, inset 0 0 0 1px ${preset.colors[0]}66`,
      }}
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <PresetAvatarArt preset={selectedPreset} className="h-full w-full p-[1px]" />
      )}
    </span>
  );
}
