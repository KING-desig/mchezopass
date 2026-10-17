'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../utils/supabase';
import { requestStkPush, completeStkPayment } from '../../utils/mpesa';
import { motion, AnimatePresence } from 'framer-motion';
import PlayerAvatar from '../components/PlayerAvatar';

interface Event {
  id: string;
  title: string;
  game: string;
  start_date: string;
  max_teams: number;
  whatsapp_link: string;
  entry_fee: number;
  profiles: { username: string; avatar_url: string | null; avatar_preset: string | null };
}

const GAMES = [
  { name: 'PUBG Mobile', label: 'BATTLE ROYALE', accent: 'text-orange-500', border: 'border-orange-500/30', glow: 'shadow-orange-500/20', gradient: 'from-orange-700 via-yellow-600 to-orange-900', bgImage: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80' },
  { name: 'Call of Duty Mobile', label: 'TACTICAL OPS', accent: 'text-blue-500', border: 'border-blue-500/30', glow: 'shadow-blue-500/20', gradient: 'from-slate-800 via-blue-900 to-slate-950', bgImage: 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format&fit=crop&w=800&q=80' },
  { name: 'FIFA / EA FC', label: 'FOOTBALL', accent: 'text-green-500', border: 'border-green-500/30', glow: 'shadow-green-500/20', gradient: 'from-green-700 via-emerald-600 to-green-900', bgImage: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=800&q=80' },
  { name: 'Free Fire', label: 'SURVIVAL', accent: 'text-red-500', border: 'border-red-500/30', glow: 'shadow-red-500/20', gradient: 'from-red-700 via-orange-600 to-red-900', bgImage: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=800&q=80' },
  { name: 'eFootball', label: 'FOOTBALL SIM', accent: 'text-sky-400', border: 'border-sky-500/30', glow: 'shadow-sky-500/20', gradient: 'from-sky-700 via-blue-600 to-sky-900', bgImage: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=800&q=80' },
];

const getGameTheme = (game: string) => {
  const found = GAMES.find((g) => g.name === game);
  if (found) return found;
  return { name: game, label: 'GAMING', accent: 'text-gray-400', border: 'border-gray-500/30', glow: 'shadow-gray-500/20', gradient: 'from-gray-700 via-gray-800 to-gray-950', bgImage: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80' };
};

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [userId, setUserId] = useState('');

  const [title, setTitle] = useState('');
  const [game, setGame] = useState('PUBG Mobile');
  const [startDate, setStartDate] = useState('');
  const [maxTeams, setMaxTeams] = useState(16);
  const [whatsappLink, setWhatsappLink] = useState('');
  const [entryFee, setEntryFee] = useState(0);

  // Payment modal states
  const [payEvent, setPayEvent] = useState<Event | null>(null);
  const [payStep, setPayStep] = useState<'phone' | 'pin' | 'success'>('phone');
  const [payPhone, setPayPhone] = useState('');
  const [payPin, setPayPin] = useState('');
  const [payProcessing, setPayProcessing] = useState(false);
  const [payError, setPayError] = useState('');
  const [payReceipt, setPayReceipt] = useState('');
  const [paymentId, setPaymentId] = useState('');

  const router = useRouter();

  const requireLogin = (action: string) => {
    if (!userId) {
      alert(`Please sign in to ${action}.`);
      router.push('/login');
      return true;
    }
    return false;
  };

  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
    }
  };

  const fetchEvents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('events')
      .select('*, profiles:organizer_id(username, avatar_url, avatar_preset)')
      .order('start_date', { ascending: true });

    if (error) console.error('Fetch Events Error:', error);
    if (!error && data) setEvents(data as Event[]);
    setLoading(false);
  };

  useEffect(() => {
    void (async () => {
      await fetchUser();
      await fetchEvents();
    })();
  }, []);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (requireLogin('create an event')) return;

    const fee = Number(entryFee) || 0;
    const { error } = await supabase.from('events').insert({
      organizer_id: userId,
      title,
      game,
      start_date: startDate,
      max_teams: maxTeams,
      whatsapp_link: whatsappLink,
      entry_fee: fee,
      is_free: fee <= 0,
      status: 'upcoming'
    });

    if (error) {
      alert('Error creating event: ' + error.message);
    } else {
      setShowForm(false);
      setTitle(''); setStartDate(''); setWhatsappLink(''); setEntryFee(0);
      fetchEvents();
    }
  };

  const handleJoinEvent = async (eventId: string) => {
    if (requireLogin('join an event')) return;
    const { error } = await supabase.from('event_participants').insert({
      event_id: eventId,
      user_id: userId
    });

    if (error) {
      alert('Error joining event: ' + error.message);
    } else {
      alert('Successfully joined the event! Check the WhatsApp link.');
    }
  };

  // REGISTER button: free = instant join, paid = M-Pesa flow
  const handleRegister = (event: Event) => {
    if (requireLogin('register for an event')) return;
    if ((event.entry_fee || 0) > 0) {
      setPayEvent(event);
      setPayStep('phone');
      setPayPhone('');
      setPayPin('');
      setPayError('');
      setPayReceipt('');
    } else {
      handleJoinEvent(event.id);
    }
  };

  const requestPayment = async () => {
    if (!payEvent) return;
    if (requireLogin('complete payment')) return;
    setPayProcessing(true);
    setPayError('');

    // 1) Record the payment as pending in the ledger
    const { data: payRow, error: payErr } = await supabase
      .from('payments')
      .insert({
        event_id: payEvent.id,
        user_id: userId,
        phone: payPhone,
        amount: payEvent.entry_fee,
        status: 'pending',
      })
      .select()
      .single();

    if (payErr || !payRow) {
      setPayError('Could not start payment: ' + (payErr?.message || 'unknown error'));
      setPayProcessing(false);
      return;
    }
    setPaymentId(payRow.id);

    // 2) Fire the STK push (mock: simulates Safaricom sending the PIN prompt)
    const res = await requestStkPush(payPhone, payEvent.entry_fee, payRow.id);
    if (res.success) {
      setPayStep('pin');
    } else {
      setPayError(res.message || 'M-Pesa request failed. Try again.');
    }
    setPayProcessing(false);
  };

  const confirmPayment = async () => {
    if (!payEvent) return;
    if (requireLogin('confirm payment')) return;
    setPayProcessing(true);
    setPayError('');

    const res = await completeStkPayment(paymentId, payPin);
    if (res.success && res.receipt) {
      // 3) Mark payment paid + register the player
      await supabase.from('payments').update({ status: 'paid', mpesa_receipt: res.receipt }).eq('id', paymentId);
      const { error: joinErr } = await supabase.from('event_participants').insert({ event_id: payEvent.id, user_id: userId });
      if (joinErr) console.error('Join error after payment:', joinErr.message);
      setPayReceipt(res.receipt);
      setPayStep('success');
    } else {
      await supabase.from('payments').update({ status: 'failed' }).eq('id', paymentId);
      setPayError(res.message || 'Payment failed.');
    }
    setPayProcessing(false);
  };

  const closePayModal = () => {
    setPayEvent(null);
    setPayStep('phone');
    setPayPin('');
    setPayError('');
  };

  return (
    <main className="min-h-screen pb-24">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 glass-panel border-b border-purple-900/50">
        <div className="max-w-md mx-auto p-4 flex justify-between items-center">
          <h1 className="text-xl font-black text-purple-400 gaming-font">TOURNAMENT <span className="text-white">HUB</span></h1>
          <button onClick={() => router.push('/')} className="text-xs bg-gray-800 hover:bg-gray-700 px-3 py-1 rounded border border-gray-700">BACK</button>
        </div>
      </header>

      <div className="max-w-md mx-auto pt-24 px-4 space-y-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-black text-white gaming-font tracking-wider">UPCOMING EVENTS</h2>
          <motion.button
            onClick={() => setShowForm(!showForm)}
            className="bg-green-500 hover:bg-green-400 text-black px-4 py-2 rounded font-black text-xs gaming-font tracking-wider shadow-[0_0_12px_rgba(57,255,20,0.4)]"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {showForm ? 'CANCEL' : '+ HOST EVENT'}
          </motion.button>
        </div>

        {/* Create Event Form */}
        <AnimatePresence>
          {showForm && (
            <motion.form
              onSubmit={handleCreateEvent}
              className="glass-panel p-4 rounded-xl border border-green-500/30 space-y-3"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div>
                <label className="block text-[10px] text-gray-400 mb-1 uppercase tracking-widest font-bold">Event Title</label>
                <input type="text" placeholder="e.g., Saturday PUBG Cup" value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full bg-black/80 border border-gray-700 p-2 rounded text-sm text-white focus:border-green-500 outline-none" />
              </div>
              <div>
                <label className="block text-[10px] text-gray-400 mb-1 uppercase tracking-widest font-bold">Game</label>
                <select value={game} onChange={(e) => setGame(e.target.value)} className="w-full bg-black/80 border border-gray-700 p-2 rounded text-sm text-white focus:border-green-500 outline-none">
                  {GAMES.map((g) => (
                    <option key={g.name}>{g.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-gray-400 mb-1 uppercase tracking-widest font-bold">Start Date & Time</label>
                <input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} required className="w-full bg-black/80 border border-gray-700 p-2 rounded text-sm text-white focus:border-green-500 outline-none" />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-[10px] text-gray-400 mb-1 uppercase tracking-widest font-bold">Max Teams</label>
                  <input type="number" placeholder="16" value={maxTeams} onChange={(e) => setMaxTeams(Number(e.target.value))} required className="w-full bg-black/80 border border-gray-700 p-2 rounded text-sm text-white focus:border-green-500 outline-none" />
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] text-gray-400 mb-1 uppercase tracking-widest font-bold">Entry Fee (KES, 0 = free)</label>
                  <input type="number" min={0} value={entryFee} onChange={(e) => setEntryFee(Number(e.target.value))} className="w-full bg-black/80 border border-gray-700 p-2 rounded text-sm text-white focus:border-yellow-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-gray-400 mb-1 uppercase tracking-widest font-bold">WhatsApp Lobby Link</label>
                <input type="text" placeholder="https://chat.whatsapp.com/..." value={whatsappLink} onChange={(e) => setWhatsappLink(e.target.value)} className="w-full bg-black/80 border border-gray-700 p-2 rounded text-sm text-white focus:border-green-500 outline-none" />
              </div>
              <motion.button type="submit" className="w-full bg-green-500 hover:bg-green-400 text-black py-2 rounded font-black text-sm gaming-font tracking-wider" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                PUBLISH EVENT
              </motion.button>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Events List */}
        {loading ? (
          <div className="flex justify-center mt-10"><div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div></div>
        ) : events.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel p-8 rounded-xl text-center border border-gray-800">
            <p className="text-gray-400 text-sm gaming-font">NO UPCOMING EVENTS. HOST THE FIRST!</p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {events.map((event, index) => {
              const theme = getGameTheme(event.game);
              const isPaid = (event.entry_fee || 0) > 0;
              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.08 }}
                  whileHover={{ y: -4 }}
                  className={`glass-panel rounded-xl overflow-hidden border ${theme.border} shadow-lg ${theme.glow}`}
                >
                  {/* Event Banner */}
                  <div className={`relative h-28 w-full overflow-hidden bg-gradient-to-br ${theme.gradient}`}>
                    <img
                      src={theme.bgImage}
                      alt={event.game}
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      className="absolute inset-0 w-full h-full object-cover opacity-60"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
                    <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-sm px-2 py-1 rounded border border-white/10">
                      <p className={`text-[9px] font-black ${theme.accent} gaming-font tracking-widest`}>{theme.label}</p>
                    </div>
                    <div className={`absolute top-2 left-2 backdrop-blur-sm px-2 py-1 rounded ${isPaid ? 'bg-yellow-500/90' : 'bg-green-600/80'}`}>
                      <p className="text-[9px] font-black text-black gaming-font tracking-widest">{isPaid ? `KES ${event.entry_fee}` : 'FREE ENTRY'}</p>
                    </div>
                    <div className="absolute bottom-2 left-3 right-3">
                      <h3 className="text-lg font-black text-white gaming-font tracking-wider drop-shadow-lg">{event.title}</h3>
                    </div>
                  </div>

                  {/* Event Info */}
                  <div className="p-4 bg-black/60 space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-bold ${theme.accent}`}>{event.game}</span>
                      <span className="text-gray-600">•</span>
                      <span className="text-xs text-gray-400">
                        {new Date(event.start_date).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="text-gray-600">•</span>
                      <span className="text-xs text-gray-400">Max {event.max_teams}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                      <PlayerAvatar
                        username={event.profiles?.username || 'Unknown'}
                        avatarUrl={event.profiles?.avatar_url}
                        avatarPreset={event.profiles?.avatar_preset}
                        className="h-6 w-6 border border-white/15 text-xs"
                      />
                      <p className="text-xs text-gray-300">
                        Hosted by: <span className="font-bold text-white">{event.profiles?.username || 'Unknown'}</span>
                      </p>
                    </div>

                    <div className="flex gap-2 mt-3">
                      {event.whatsapp_link && (
                        <motion.a
                          href={event.whatsapp_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 text-center bg-green-600/20 text-green-400 border border-green-500/50 py-2 rounded font-black text-xs gaming-font tracking-wider shadow-[0_0_10px_rgba(57,255,20,0.2)]"
                          whileHover={{ backgroundColor: "rgba(34, 197, 94, 1)", color: "black", boxShadow: "0px 0px 20px rgba(57, 255, 20, 0.8)" }}
                          whileTap={{ scale: 0.95 }}
                        >
                          JOIN LOBBY 💬
                        </motion.a>
                      )}
                      <motion.button
                        onClick={() => handleRegister(event)}
                        className={`flex-1 py-2 rounded font-black text-xs gaming-font tracking-wider ${isPaid ? 'bg-yellow-500 hover:bg-yellow-400 text-black shadow-[0_0_10px_rgba(234,179,8,0.4)]' : 'bg-purple-600 hover:bg-purple-500 shadow-[0_0_10px_rgba(147,51,234,0.3)]'}`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {isPaid ? `PAY KES ${event.entry_fee} & ENTER` : 'REGISTER NOW'}
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* M-PESA PAYMENT MODAL */}
      <AnimatePresence>
        {payEvent && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="glass-panel p-6 rounded-xl w-full max-w-sm border border-green-500/40">
              
              {payStep === 'phone' && (
                <>
                  <div className="text-center mb-4">
                    <div className="w-14 h-14 mx-auto mb-2 rounded-full bg-green-500 flex items-center justify-center text-2xl font-black text-black gaming-font shadow-[0_0_25px_rgba(57,255,20,0.6)]">M</div>
                    <h3 className="text-lg font-black text-white gaming-font">M-PESA PAYMENT</h3>
                    <p className="text-xs text-gray-400">{payEvent.title}</p>
                    <p className="text-2xl font-black text-yellow-400 gaming-font mt-1">KES {payEvent.entry_fee}</p>
                  </div>
                  <label className="block text-[10px] text-gray-400 mb-1 uppercase tracking-widest font-bold">Safaricom Number</label>
                  <input
                    type="tel"
                    value={payPhone}
                    onChange={(e) => setPayPhone(e.target.value)}
                    placeholder="07XX XXX XXX"
                    className="w-full bg-black/80 border border-gray-700 p-3 rounded text-sm text-white focus:border-green-500 outline-none mb-3"
                  />
                  {payError && <p className="text-xs text-red-400 mb-2">{payError}</p>}
                  <div className="flex gap-3">
                    <button onClick={closePayModal} className="flex-1 bg-gray-800 hover:bg-gray-700 py-2 rounded font-bold text-sm border border-gray-700">CANCEL</button>
                    <motion.button onClick={requestPayment} disabled={payProcessing || payPhone.length < 10} className="flex-1 bg-green-500 hover:bg-green-400 text-black py-2 rounded font-black text-sm gaming-font disabled:opacity-50" whileTap={{ scale: 0.95 }}>
                      {payProcessing ? 'SENDING...' : 'SEND REQUEST'}
                    </motion.button>
                  </div>
                </>
              )}

              {payStep === 'pin' && (
                <>
                  <div className="text-center mb-4">
                    <div className="w-14 h-14 mx-auto mb-2 rounded-full bg-green-500 flex items-center justify-center text-2xl font-black text-black gaming-font shadow-[0_0_25px_rgba(57,255,20,0.6)]">M</div>
                    <h3 className="text-lg font-black text-white gaming-font">ENTER M-PESA PIN</h3>
                    <p className="text-xs text-gray-400 mt-1">
                      Simulated STK push sent to <span className="text-green-400 font-bold">{payPhone}</span>
                    </p>
                    <p className="text-xs text-gray-500">Pay KES {payEvent.entry_fee} to MCHEZOPASS</p>
                  </div>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={payPin}
                    onChange={(e) => setPayPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="****"
                    className="w-full bg-black/80 border border-gray-700 p-3 rounded text-center text-2xl tracking-[0.5em] text-white focus:border-green-500 outline-none mb-3"
                  />
                  {payError && <p className="text-xs text-red-400 mb-2">{payError}</p>}
                  <div className="flex gap-3">
                    <button onClick={closePayModal} className="flex-1 bg-gray-800 hover:bg-gray-700 py-2 rounded font-bold text-sm border border-gray-700">CANCEL</button>
                    <motion.button onClick={confirmPayment} disabled={payProcessing || payPin.length !== 4} className="flex-1 bg-green-500 hover:bg-green-400 text-black py-2 rounded font-black text-sm gaming-font disabled:opacity-50" whileTap={{ scale: 0.95 }}>
                      {payProcessing ? 'PROCESSING...' : 'CONFIRM PAYMENT'}
                    </motion.button>
                  </div>
                </>
              )}

              {payStep === 'success' && (
                <div className="text-center">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }} className="w-16 h-16 mx-auto mb-3 rounded-full bg-green-500 flex items-center justify-center text-3xl text-black shadow-[0_0_30px_rgba(57,255,20,0.7)]">✓</motion.div>
                  <h3 className="text-lg font-black text-green-400 gaming-font mb-1">PAYMENT SUCCESSFUL</h3>
                  <p className="text-xs text-gray-400 mb-2">You are registered for {payEvent.title}!</p>
                  <p className="text-[10px] text-gray-500 mb-4">Receipt: <span className="text-white font-bold">{payReceipt}</span></p>
                  <motion.button onClick={closePayModal} className="w-full bg-green-500 hover:bg-green-400 text-black py-2 rounded font-black text-sm gaming-font" whileTap={{ scale: 0.95 }}>
                    DONE
                  </motion.button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}