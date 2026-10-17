// app/login/page.tsx
'use client'; // Required for Next.js App Router to use browser features

import { useState } from 'react';
import { supabase } from '../utils/supabase';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1); // 1 = Enter Phone, 2 = Enter OTP
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  // Step 1: Send OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Supabase requires E.164 format (e.g., +254712345678)
    const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;

    const { error } = await supabase.auth.signInWithOtp({
      phone: formattedPhone,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setStep(2); // Move to OTP input screen
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
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
    } else {
      // Success! Redirect to create profile
      router.push('/create-profile'); 
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white p-4">
      <div className="w-full max-w-md bg-gray-800 p-8 rounded-2xl shadow-xl">
        <h1 className="text-3xl font-bold text-center mb-2 text-green-400">MchezoPass</h1>
        <p className="text-center text-gray-400 mb-8">Your Kenyan Gaming Passport</p>

        {error && <p className="text-red-500 text-center mb-4 bg-red-900/20 p-2 rounded">{error}</p>}

        {step === 1 ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <label className="block text-sm font-medium text-gray-300">Phone Number</label>
            <input
              type="tel"
              placeholder="+254 7XX XXX XXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-green-600 hover:bg-green-700 rounded-lg font-bold transition disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <p className="text-sm text-gray-400 text-center mb-4">
              Enter the 6-digit code sent to <span className="text-white font-bold">{phone}</span>
            </p>
            <input
              type="text"
              placeholder="123456"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              maxLength={6}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-center text-2xl tracking-widest focus:ring-2 focus:ring-green-500 focus:outline-none"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-green-600 hover:bg-green-700 rounded-lg font-bold transition disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify & Login'}
            </button>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full text-sm text-gray-400 hover:text-white"
            >
              Change phone number
            </button>
          </form>
        )}
      </div>
    </main>
  );
}