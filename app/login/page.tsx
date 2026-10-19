'use client';

import { useState } from 'react';
import { supabase } from '../../utils/supabase';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

export default function LoginPage() {
  const [mode, setMode] = useState<'email' | 'phone'>('email'); // Default to Email (Free)
  const [contact, setContact] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'contact' | 'otp'>('contact');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const router = useRouter();

  const getPhoneNumber = () => {
    const phone = contact.trim().replace(/[\s()-]/g, '');
    if (/^0[17]\d{8}$/.test(phone)) return `+254${phone.slice(1)}`;
    if (/^254[17]\d{8}$/.test(phone)) return `+${phone}`;
    return phone;
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (mode === 'email') {
        const { error } = await supabase.auth.signInWithOtp({
          email: contact.trim(),
          options: { shouldCreateUser: true },
        });
        if (error) {
          setMessage('Error: ' + error.message);
        } else {
          setMessage('Check your email for the 6-digit code!');
          setStep('otp');
        }
      } else {
        const { error } = await supabase.auth.signInWithOtp({ phone: getPhoneNumber() });
        if (error) {
          setMessage('SMS Error: ' + error.message);
        } else {
          setMessage('Check your phone for the SMS code!');
          setStep('otp');
        }
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not send the login code.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const { data, error } = mode === 'email'
        ? await supabase.auth.verifyOtp({ email: contact.trim(), token: otp, type: 'email' })
        : await supabase.auth.verifyOtp({ phone: getPhoneNumber(), token: otp, type: 'sms' });

      if (error) {
        setMessage('Invalid code. Try again.');
      } else if (data.session) {
        router.push('/');
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not verify the login code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-green-600/20 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl"></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md glass-panel p-8 rounded-2xl border border-green-500/30 shadow-[0_0_50px_rgba(57,255,20,0.15)] relative z-10"
      >
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black neon-text-green gaming-font tracking-tighter">MCHEZO<span className="text-white">PASS</span></h1>
          <p className="text-gray-400 text-sm mt-2 uppercase tracking-widest">Enter The Arena</p>
        </div>

        {/* Tabs */}
        <div className="flex mb-6 bg-black/60 rounded-lg p-1 border border-gray-800">
          <button
            onClick={() => { setMode('email'); setStep('contact'); setMessage(''); }}
            className={`flex-1 py-2 rounded-md text-xs font-black gaming-font tracking-wider transition ${mode === 'email' ? 'bg-green-500 text-black' : 'text-gray-400 hover:text-white'}`}
          >
            EMAIL (FREE)
          </button>
          <button
            onClick={() => { setMode('phone'); setStep('contact'); setMessage(''); }}
            className={`flex-1 py-2 rounded-md text-xs font-black gaming-font tracking-wider transition ${mode === 'phone' ? 'bg-green-500 text-black' : 'text-gray-400 hover:text-white'}`}
          >
            PHONE
          </button>
        </div>

        <AnimatePresence mode="wait">
          {step === 'contact' ? (
            <motion.form key="contact" onSubmit={handleSendCode} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-4">
              <div>
                <label className="block text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-2">
                  {mode === 'email' ? 'Email Address' : 'Phone Number'}
                </label>
                <input
                  type={mode === 'email' ? 'email' : 'tel'}
                  placeholder={mode === 'email' ? 'gamer@example.com' : '0712 345 678'}
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  required
                  className="w-full bg-black/80 border border-gray-700 p-3 rounded-lg text-white focus:border-green-500 outline-none transition"
                />
              </div>

              {message && <p className="text-xs text-yellow-400 text-center">{message}</p>}

              <motion.button
                type="submit"
                disabled={loading}
                className="w-full bg-green-500 hover:bg-green-400 text-black py-3 rounded-lg font-black gaming-font tracking-wider shadow-[0_0_20px_rgba(57,255,20,0.4)] disabled:opacity-50"
                whileTap={{ scale: 0.98 }}
              >
                {loading ? 'SENDING...' : 'SEND LOGIN CODE'}
              </motion.button>
            </motion.form>
          ) : (
            <motion.form key="otp" onSubmit={handleVerify} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div>
                <label className="block text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-2">
                  6-Digit Code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="• • • • • •"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  required
                  className="w-full bg-black/80 border border-gray-700 p-3 rounded-lg text-center text-2xl tracking-[0.5em] text-white focus:border-green-500 outline-none transition"
                />
              </div>

              {message && <p className="text-xs text-red-400 text-center">{message}</p>}

              <motion.button
                type="submit"
                disabled={loading || otp.length < 6}
                className="w-full bg-green-500 hover:bg-green-400 text-black py-3 rounded-lg font-black gaming-font tracking-wider shadow-[0_0_20px_rgba(57,255,20,0.4)] disabled:opacity-50"
                whileTap={{ scale: 0.98 }}
              >
                {loading ? 'VERIFYING...' : 'ENTER ARENA'}
              </motion.button>

              <button
                type="button"
                onClick={() => { setStep('contact'); setOtp(''); setMessage(''); }}
                className="w-full text-xs text-gray-500 hover:text-white transition"
              >
                ← Change {mode === 'email' ? 'Email' : 'Phone'}
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </main>
  );
}