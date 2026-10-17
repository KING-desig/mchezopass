import type { CSSProperties } from 'react';

export const GAME_OPTIONS = ['PUBG Mobile', 'Call of Duty Mobile', 'FIFA / EA FC', 'Free Fire'] as const;

interface GameVisual {
  accent: string;
  marker: string;
  label: string;
  artwork: string;
  wordmark: string;
}

const GAME_VISUALS: Record<(typeof GAME_OPTIONS)[number], GameVisual> = {
  'PUBG Mobile': {
    accent: '#f2a43a',
    marker: 'ERANGEL / SQUAD',
    label: 'BATTLE ROYALE',
    wordmark: 'DROP ZONE',
    artwork: 'radial-gradient(ellipse at 78% 16%, rgba(255, 208, 126, .64), transparent 20%), radial-gradient(ellipse at 17% 85%, rgba(133, 119, 67, .78), transparent 42%), linear-gradient(145deg, #66754b 0%, #394b3d 48%, #172c27 100%)',
  },
  'Call of Duty Mobile': {
    accent: '#8bd5e8',
    marker: 'MULTIPLAYER / BR',
    label: 'TACTICAL OPS',
    wordmark: 'MISSION READY',
    artwork: 'repeating-linear-gradient(0deg, transparent 0 22px, rgba(180, 222, 230, .08) 23px 24px), radial-gradient(ellipse at 75% 20%, rgba(89, 153, 170, .45), transparent 35%), linear-gradient(135deg, #263d49 0%, #182b37 48%, #11191d 100%)',
  },
  'FIFA / EA FC': {
    accent: '#8bff83',
    marker: 'ULTIMATE TEAM / CLUBS',
    label: 'MATCH DAY',
    wordmark: 'KICK OFF',
    artwork: 'repeating-linear-gradient(90deg, rgba(166, 255, 154, .055) 0 30px, transparent 30px 60px), radial-gradient(ellipse at 50% 0%, rgba(233, 255, 196, .42), transparent 38%), linear-gradient(160deg, #198754 0%, #086342 54%, #063c35 100%)',
  },
  'Free Fire': {
    accent: '#ffae71',
    marker: 'RANKED / CLASH SQUAD',
    label: 'LAST SQUAD STANDING',
    wordmark: 'BOOYAH RUN',
    artwork: 'radial-gradient(ellipse at 76% 18%, rgba(255, 188, 78, .72), transparent 18%), radial-gradient(ellipse at 25% 95%, rgba(240, 59, 43, .48), transparent 43%), linear-gradient(145deg, #653526 0%, #3a2426 48%, #191a20 100%)',
  },
};

export function getGameVisual(game: string): GameVisual {
  if (game === 'FIFA / EA FC' || game === 'EA FC' || game === 'eFootball') {
    return GAME_VISUALS['FIFA / EA FC'];
  }

  if (game === 'PUBG Mobile' || game === 'Call of Duty Mobile' || game === 'Free Fire') {
    return GAME_VISUALS[game];
  }

  return {
    accent: '#b8d9ce',
    marker: 'OPEN LOBBY',
    label: 'GAMING',
    wordmark: 'SQUAD UP',
    artwork: 'radial-gradient(ellipse at 75% 15%, rgba(148, 163, 184, .35), transparent 28%), linear-gradient(145deg, #334c48, #111b1b)',
  };
}

interface GameArtworkProps {
  game: string;
  compact?: boolean;
}

export default function GameArtwork({ game, compact = false }: GameArtworkProps) {
  const visual = getGameVisual(game);
  const style = {
    '--game-accent': visual.accent,
    '--game-artwork': visual.artwork,
  } as CSSProperties;

  return (
    <div className={`game-artwork${compact ? ' game-artwork--compact' : ''}`} style={style} aria-hidden="true">
      <div className="game-artwork__orbit"></div>
      <div className="game-artwork__grid"></div>
      <div className="game-artwork__beam"></div>
      <div className="game-artwork__copy">
        <span>{visual.label}</span>
        <strong>{visual.wordmark}</strong>
      </div>
      <span className="game-artwork__index">MP / 0{GAME_OPTIONS.findIndex((option) => getGameVisual(option).label === visual.label) + 1 || 'X'}</span>
    </div>
  );
}
