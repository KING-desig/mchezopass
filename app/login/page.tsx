'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { supabase } from '../../utils/supabase';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;

    const { error } = await supabase.auth.signInWithOtp({
      phone: formattedPhone,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setStep(2);
    setLoading(false);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;

    const { error } = await supabase.auth.verifyOtp({
      phone: formattedPhone,
      token: otp,
      type: 'sms',
    });

    if (error) {
      setError('Invalid code. Please try again.');
      setLoading(false);
      return;
    }

    router.push('/create-profile');
  };

  return (
    <main className="game-world flex min-h-screen flex-col items-center justify-center bg-black px-4 py-10 text-white">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="w-full max-w-md rounded-2xl border border-green-500/20 bg-[#0b120f]/90 p-6 shadow-[0_0_40px_rgba(57,255,20,0.08)] backdrop-blur-sm sm:p-8"
      >
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="mb-6 text-center"
        >
          <h1 className="gaming-font text-4xl font-black tracking-widest text-green-400 drop-shadow-[0_0_12px_rgba(57,255,20,0.4)]">MCHEZOPASS</h1>
          <p className="mt-3 text-sm text-gray-400">Your Kenyan Gaming Passport</p>
        </motion.div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-4 rounded-lg border border-red-500/40 bg-red-950/40 p-3 text-center text-sm text-red-300"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.form
              key="phone-step"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              onSubmit={handleSendOtp}
              className="space-y-4"
            >
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-300">Phone Number</label>
                <input
                  type="tel"
                  placeholder="+254 7XX XXX XXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-lg border border-gray-700 bg-black/70 px-4 py-3 text-white outline-none transition focus:border-green-500"
                  required
                />
              </div>
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-green-500 py-3 text-base font-black text-black shadow-[0_0_18px_rgba(57,255,20,0.45)] transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Sending...' : 'Send OTP'}
              </motion.button>
            </motion.form>
          ) : (
            <motion.form
              key="otp-step"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              onSubmit={handleVerifyOtp}
              className="space-y-4"
            >
              <p className="text-center text-sm text-gray-400">
                Enter the 6-digit code sent to <span className="font-bold text-white">{phone}</span>
              </p>
              <input
                type="text"
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                maxLength={6}
                className="w-full rounded-lg border border-gray-700 bg-black/70 px-4 py-3 text-center text-2xl tracking-[0.6rem] text-white outline-none transition focus:border-green-500"
                required
              />
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-green-500 py-3 text-base font-black text-black shadow-[0_0_18px_rgba(57,255,20,0.45)] transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? 'Verifying...' : 'Verify & Login'}
              </motion.button>
              <motion.button
                whileHover={{ opacity: 1 }}
                type="button"
                onClick={() => setStep(1)}
                className="w-full text-sm text-gray-400 transition hover:text-white"
              >
                Change phone number
              </motion.button>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </main>
  );
}
