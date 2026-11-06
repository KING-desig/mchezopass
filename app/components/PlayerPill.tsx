'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';

const PRESETS: Record<string, { emoji: string; bg: string }> = {
  ninja: { emoji: '🥷', bg: 'bg-red-600' },
  robot: { emoji: '🤖', bg: 'bg-blue-600' },
  alien: { emoji: '👾', bg: 'bg-purple-600' },
  fox: { emoji: '🦊', bg: 'bg-orange-600' },
  dragon: { emoji: '🐲', bg: 'bg-green-600' },
  eagle: { emoji: '🦅', bg: 'bg-yellow-600' },
  rookie: { emoji: '🎮', bg: 'bg-gray-600' } // Default preset
};

interface PlayerPillProps {
  username: string;
  avatarUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  showName?: boolean;
}

export default function PlayerPill({ username, avatarUrl, size = 'md', onClick, showName = true }: PlayerPillProps) {
  const sizes = {
    sm: { img: 'w-6 h-6 text-xs', text: 'text-[10px]', px: 24 },
    md: { img: 'w-8 h-8 text-sm', text: 'text-xs', px: 32 },
    lg: { img: 'w-12 h-12 text-xl', text: 'text-sm', px: 48 }
  };

  const s = sizes[size];
  const isPreset = avatarUrl?.startsWith('preset://');
  const presetId = isPreset ? avatarUrl!.split('//')[1] : null;
  const preset = presetId ? PRESETS[presetId] : null;

  const renderAvatar = () => {
    if (isPreset && preset) {
      return <div className={`${s.img} rounded-full ${preset.bg} flex items-center justify-center shadow-md`}>{preset.emoji}</div>;
    } else if (avatarUrl && !isPreset) {
      return <Image src={avatarUrl} alt={username} width={s.px} height={s.px} className={`${s.img} rounded-full object-cover shadow-md border border-gray-700`} />;
    }
    return <div className={`${s.img} rounded-full bg-gradient-to-br from-green-400 to-blue-600 flex items-center justify-center font-black text-black shadow-md`}>{username.charAt(0).toUpperCase()}</div>;
  };

  const Container = onClick ? motion.button : 'div';
  const props = onClick ? { onClick, whileHover: { scale: 1.05 }, whileTap: { scale: 0.95 } } : {};

  return (
    <Container {...props} className={`flex items-center gap-2 ${onClick ? 'cursor-pointer' : ''}`}>
      {renderAvatar()}
      {showName && <span className={`${s.text} font-bold text-white gaming-font tracking-wide`}>{username}</span>}
    </Container>
  );
}