'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Plane, Calendar, MapPin, Users, Sparkles, LogOut, PlusCircle, Leaf, MessageSquare, Search, Settings, User } from 'lucide-react';

export default function FlyShareApp() {
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'rides' | 'impact' | 'ai' | 'messages' | 'settings'>('rides');

  // Rides state
  const [rides, setRides] = useState<any[]>([]);
  const [pickupLocation, setPickupLocation] = useState('UNC Student Union');
  const [destination, setDestination] = useState('RDU Airport Terminal 2');
  const [rideTime, setRideTime] = useState('14:00');
  const [departureDate, setDepartureDate] = useState('');
  const [travelCount, setTravelCount] = useState(1);
  const [notes, setNotes] = useState('');

  // Search & Filter state
  const [searchDate, setSearchDate] = useState('');
  const [searchLocation, setSearchLocation] = useState('');
  const [searchDestination, setSearchDestination] = useState('');

  // Profile customization state
  const [profile, setProfile] = useState<any>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');

  // Direct Messages state
  const [messages, setMessages] = useState<any[]>([]);
  const [messageRecipient, setMessageRecipient] = useState('');
  const [messageContent, setMessageContent] = useState('');

  // AI Assistant State
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    async function getUserAndData() {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchRides();
        fetchProfile(session.user.id);
        fetchMessages(session.user.id);
      }
    }
    getUserAndData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchRides();
        fetchProfile(session.user.id);
        fetchMessages(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  async function fetchProfile(userId: string) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (data) {
      setProfile(data);
      setEditName(data.full_name || '');
      setEditPhone(data.phone_number || '');
    }
  }

  async function fetchRides() {
    const { data } = await supabase
      .from('rides')
      .select('*, profiles(full_name, email)')
      .order('departure_date', { ascending: true });
    if (data) setRides(data);
  }

  async function fetchMessages(userId: string) {
    const { data } = await supabase
      .from('direct_messages')
      .select('*, sender:profiles!direct_messages_sender_id_fkey(full_name), receiver:profiles!direct_messages_receiver_id_fkey(full_name)')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: false });
    if (data) setMessages(data);
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.endsWith('@ad.unc.edu') && !email.endsWith('@email.unc.edu')) {
      alert('Access restricted to UNC students! Please use your @ad.unc.edu or @email.unc.edu ONYEN email.');
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } }
    });
    if (error) {
      alert(error.message);
    } else if (data.user) {
      await supabase.from('profiles').insert([{ id: data.user.id, full_name: fullName || 'Tar Heel Student', email }]);
      alert('Account created successfully! You can now log in.');
    }
    setLoading(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    setLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: editName, phone_number: editPhone })
      .eq('id', user.id);
    if (error) alert(error.message);
    else {
      alert('Profile updated successfully!');
      fetchProfile(user.id);
    }
  };

  const handleCreateRide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!departureDate || !rideTime) return alert('Please enter both departure date and ride time.');

    const { error } = await supabase.from('rides').insert([
      {
        creator_id: user.id,
        origin: pickupLocation,
        destination,
        departure_date: departureDate,
        departure_time: rideTime,
        available_seats: Math.max(1, 4 - travelCount),
        travel_count: travelCount,
        notes,
        estimated_cost: 45.00,
        status: 'open'
      }
    ]);

    if (error) alert(error.message);
    else {
      alert('Ride posted to bulletin successfully!');
      setNotes('');
      fetchRides();
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageContent.trim()) return;

    // Find recipient profile by email or name
    const { data: recipientData } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', messageRecipient)
      .single();

    if (!recipientData) {
      alert('Could not find a user with that exact UNC email address.');
      return;
    }

    const { error } = await supabase.from('direct_messages').insert([
      {
        sender_id: user.id,
        receiver_id: recipientData.id,
        content: messageContent
      }
    ]);

    if (error) alert(error.message);
    else {
      alert('Direct message sent!');
      setMessageContent('');
      setMessageRecipient('');
      fetchMessages(user.id);
    }
  };

  const filteredRides = rides.filter(ride => {
    const matchesDate = searchDate ? ride.departure_date?.includes(searchDate) : true;
    const matchesLocation = searchLocation ? ride.origin?.toLowerCase().includes(searchLocation.toLowerCase()) : true;
    const matchesDestination = searchDestination ? ride.destination?.toLowerCase().includes(searchDestination.toLowerCase()) : true;
    return matchesDate && matchesLocation && matchesDestination;
  });

  return (
    <div className="min-h-screen bg-[#00274C] text-slate-100 flex flex-col font-inter">
      {/* Top UNC Header */}
      <header className="border-b border-[#7BAFD4]/30 bg-[#00274C]/90 sticky top-0 z-50 backdrop-blur-md px-6 py-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="bg-[#7BAFD4] text-[#00274C] p-2.5 rounded-xl font-bold flex items-center justify-center shadow">
            <Plane className="w-6 h-6 rotate-45" />
          </div>
          <div>
            <h1 className="font-pixel text-xs md:text-base text-[#7BAFD4] tracking-wide">UNC SmartRide Carpool Network</h1>
            <p className="text-xs text-slate-300 font-nunito">Connect with Out of State Students</p>
          </div>
        </div>

        {user && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('settings')}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-[#7BAFD4] px-3.5 py-2 rounded-xl text-xs font-nunito transition-colors cursor-pointer border border-[#7BAFD4]/30"
            >
              <Settings className="w-4 h-4" /> Settings
            </button>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 bg-rose-950/60 hover:bg-rose-900 text-rose-200 border border-rose-800 px-3.5 py-2 rounded-xl text-xs font-nunito transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>
        )}
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full p-6 md:p-8">
        {!user ? (
          /* Authentication Card */
          <div className="max-w-md mx-auto bg-slate-900/90 border border-[#7BAFD4]/40 rounded-3xl p-8 shadow-2xl mt-12 backdrop-blur">
            <div className="text-center mb-6">
              <h2 className="font-nunito text-2xl font-bold text-white mb-2">UNC Student Login</h2>
              <p className="text-xs text-[#7BAFD4]">Restricted exclusively to @ad.unc.edu & @email.unc.edu ONYENs</p>
            </div>

            <form className="space-y-4">
              <div>
                <label className="block text-xs uppercase font-bold tracking-wider text-slate-400 mb-1">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Tar Heel"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-[#7BAFD4] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs uppercase font-bold tracking-wider text-slate-400 mb-1">UNC Email (ONYEN)</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="onyen@ad.unc.edu"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-[#7BAFD4] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs uppercase font-bold tracking-wider text-slate-400 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-[#7BAFD4] focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSignIn}
                  disabled={loading}
                  className="flex-1 bg-[#7BAFD4] hover:bg-[#659bc2] text-[#00274C] font-nunito font-bold py-3 rounded-xl transition-colors cursor-pointer shadow"
                >
                  Log In
                </button>
                <button
                  onClick={handleSignUp}
                  disabled={loading}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-nunito font-bold py-3 rounded-xl transition-colors cursor-pointer"
                >
                  Sign Up
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Dashboard */
          <div className="space-y-8">
            {/* Navigation Tabs */}
            <div className="flex flex-wrap border-b border-slate-800 gap-6 font-nunito">
              <button
                onClick={() => setActiveTab('rides')}
                className={`pb-3 font-bold text-base md:text-lg flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'rides' ? 'border-[#7BAFD4] text-[#7BAFD4]' : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users className="w-5 h-5" /> RDU Ride Board
              </button>
              <button
                onClick={() => setActiveTab('messages')}
                className={`pb-3 font-bold text-base md:text-lg flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'messages' ? 'border-[#7BAFD4] text-[#7BAFD4]' : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <MessageSquare className="w-5 h-5" /> Mailbox & DMs
              </button>
              <button
                onClick={() => setActiveTab('impact')}
                className={`pb-3 font-bold text-base md:text-lg flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'impact' ? 'border-[#7BAFD4] text-[#7BAFD4]' : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Leaf className="w-5 h-5" /> Impact Tracker
              </button>
              <button
                onClick={() => setActiveTab('ai')}
                className={`pb-3 font-bold text-base md:text-lg flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'ai' ? 'border-[#7BAFD4] text-[#7BAFD4]' : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-5 h-5" /> AI Travel Assistant
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`pb-3 font-bold text-base md:text-lg flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'settings' ? 'border-[#7BAFD4] text-[#7BAFD4]' : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Settings className="w-5 h-5" /> Settings
              </button>
            </div>

            {activeTab === 'rides' && (
              <div className="space-y-6">
                {/* Search & Filter Bar */}
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-wrap gap-4 items-center">
                  <div className="flex items-center gap-2 text-[#7BAFD4] font-nunito font-semibold text-sm">
                    <Search className="w-4 h-4" /> Filter Rides:
                  </div>
                  <input
                    type="date"
                    value={searchDate}
                    onChange={(e) => setSearchDate(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                  <input
                    type="text"
                    placeholder="Filter Pickup Location..."
                    value={searchLocation}
                    onChange={(e) => setSearchLocation(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white flex-1"
                  />
                  <input
                    type="text"
                    placeholder="Filter Destination..."
                    value={searchDestination}
                    onChange={(e) => setSearchDestination(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white flex-1"
                  />
                  {(searchDate || searchLocation || searchDestination) && (
                    <button
                      onClick={() => { setSearchDate(''); setSearchLocation(''); setSearchDestination(''); }}
                      className="text-xs text-rose-400 hover:underline"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Post a Ride Form */}
                  <div className="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
                    <h3 className="font-nunito text-xl font-bold flex items-center gap-2 text-[#7BAFD4]">
                      <PlusCircle className="w-5 h-5" /> Post RDU Ride
                    </h3>
                    <form onSubmit={handleCreateRide} className="space-y-4">
                      <div>
                        <label className="block text-xs uppercase font-bold text-slate-400 mb-1">Pickup Location</label>
                        <input
                          type="text"
                          value={pickupLocation}
                          onChange={(e) => setPickupLocation(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs uppercase font-bold text-slate-400 mb-1">Destination</label>
                        <input
                          type="text"
                          value={destination}
                          onChange={(e) => setDestination(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-sm"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs uppercase font-bold text-slate-400 mb-1">Departure Date</label>
                          <input
                            type="date"
                            value={departureDate}
                            onChange={(e) => setDepartureDate(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-xs uppercase font-bold text-slate-400 mb-1">Ride Time</label>
                          <input
                            type="time"
                            value={rideTime}
                            onChange={(e) => setRideTime(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-xs"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs uppercase font-bold text-slate-400 mb-1">Number Traveling With You</label>
                        <input
                          type="number"
                          min="1"
                          max="4"
                          value={travelCount}
                          onChange={(e) => setTravelCount(parseInt(e.target.value) || 1)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs uppercase font-bold text-slate-400 mb-1">Notes / Details</label>
                        <textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Flight #, Airline, luggage details..."
                          rows={2}
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-sm resize-none"
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full bg-[#7BAFD4] hover:bg-[#659bc2] text-[#00274C] font-nunito font-bold py-3 rounded-xl transition-colors cursor-pointer shadow"
                      >
                        Publish to Bulletin
                      </button>
                    </form>
                  </div>

                  {/* Rides List */}
                  <div className="lg:col-span-2 space-y-4">
                    <h3 className="font-nunito text-xl font-bold text-white">Active Tar Heel RDU Rides</h3>
                    {filteredRides.length === 0 ? (
                      <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-2xl text-center text-slate-400 font-nunito">
                        No rides match your filter criteria. Be the first to post a ride!
                      </div>
                    ) : (
                      filteredRides.map((ride) => {
                        const seatsLeft = ride.available_seats ?? 3;
                        const seatPercentage = Math.min(100, (seatsLeft / 3) * 100);
                        return (
                          <div key={ride.id} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow space-y-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-nunito font-bold text-lg text-[#7BAFD4] flex items-center gap-2">
                                  <MapPin className="w-4 h-4" /> {ride.origin} → {ride.destination}
                                </p>
                                <p className="text-xs text-slate-300 mt-1 flex items-center gap-2">
                                  <Calendar className="w-3.5 h-3.5" /> Date: {ride.departure_date} at {ride.departure_time}
                                </p>
                              </div>
                              <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 px-3 py-1 rounded-full text-xs font-semibold">
                                Est. ${ride.estimated_cost} Total
                              </span>
                            </div>

                            {ride.notes && (
                              <p className="text-sm text-slate-300 bg-slate-950 p-3 rounded-xl">
                                "{ride.notes}"
                              </p>
                            )}

                            <div className="flex justify-between items-center text-xs text-slate-400 pt-1">
                              <span>Posted by: <strong className="text-white">{ride.profiles?.full_name || 'UNC Student'}</strong></span>
                              <button
                                onClick={() => {
                                  setActiveTab('messages');
                                  setMessageRecipient(ride.profiles?.email || '');
                                }}
                                className="bg-[#7BAFD4] hover:bg-[#659bc2] text-[#00274C] px-3.5 py-1.5 rounded-lg font-nunito font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                              >
                                <MessageSquare className="w-3.5 h-3.5" /> DM Student
                              </button>
                            </div>

                            {/* Seats Left Meter */}
                            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80 space-y-1.5">
                              <div className="flex justify-between text-xs font-nunito">
                                <span className="text-slate-400">Available Seats Meter:</span>
                                <span className="text-[#7BAFD4] font-bold">{seatsLeft} seats left (Party size: {ride.travel_count || 1})</span>
                              </div>
                              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                                <div
                                  className="bg-[#7BAFD4] h-full transition-all duration-500"
                                  style={{ width: `${seatPercentage}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'messages' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Send DM Form */}
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl space-y-4">
                  <h3 className="font-nunito text-xl font-bold flex items-center gap-2 text-[#7BAFD4]">
                    <MessageSquare className="w-5 h-5" /> New Direct Message
                  </h3>
                  <form onSubmit={handleSendMessage} className="space-y-4">
                    <div>
                      <label className="block text-xs uppercase font-bold text-slate-400 mb-1">Recipient UNC Email</label>
                      <input
                        type="email"
                        value={messageRecipient}
                        onChange={(e) => setMessageRecipient(e.target.value)}
                        placeholder="peer@ad.unc.edu"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs uppercase font-bold text-slate-400 mb-1">Message</label>
                      <textarea
                        value={messageContent}
                        onChange={(e) => setMessageContent(e.target.value)}
                        placeholder="Hey! Are you still looking to split the RDU Uber on Friday?"
                        rows={3}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-sm resize-none"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-[#7BAFD4] hover:bg-[#659bc2] text-[#00274C] font-nunito font-bold py-3 rounded-xl transition-colors cursor-pointer shadow"
                    >
                      Send Message
                    </button>
                  </form>
                </div>

                {/* Mailbox Feed */}
                <div className="md:col-span-2 space-y-4">
                  <h3 className="font-nunito text-xl font-bold text-white">Your Mailbox & Conversations</h3>
                  {messages.length === 0 ? (
                    <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-2xl text-center text-slate-400 font-nunito">
                      Your mailbox is empty. Send a message to fellow Tar Heels from the ride board!
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div key={msg.id} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-2">
                        <div className="flex justify-between text-xs text-slate-400">
                          <span>From: <strong className="text-[#7BAFD4]">{msg.sender?.full_name || 'Tar Heel'}</strong></span>
                          <span>{new Date(msg.created_at).toLocaleString()}</span>
                        </div>
                        <p className="text-sm text-slate-200 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                          {msg.content}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'impact' && (
              <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl space-y-6">
                <h3 className="font-nunito text-2xl font-bold text-[#7BAFD4]">Community Impact Dashboard</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800">
                    <p className="text-xs uppercase text-slate-400 font-bold mb-1">Total Savings per Student</p>
                    <p className="text-3xl font-extrabold text-emerald-400">~$30.00</p>
                    <p className="text-xs text-slate-500 mt-2">Dropping $45 solo Ubers down to $15 pooled rides[cite: 3].</p>
                  </div>
                  <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800">
                    <p className="text-xs uppercase text-slate-400 font-bold mb-1">CO₂ Emissions Reduced</p>
                    <p className="text-3xl font-extrabold text-emerald-400">8,000g</p>
                    <p className="text-xs text-slate-500 mt-2">Saved per 20-mile trip pooled with fellow Tar Heels.</p>
                  </div>
                  <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800">
                    <p className="text-xs uppercase text-slate-400 font-bold mb-1">Student Participation</p>
                    <p className="text-3xl font-extrabold text-[#7BAFD4]">70%</p>
                    <p className="text-xs text-slate-500 mt-2">Of out-of-state students willing to carpool[cite: 3].</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'ai' && (
              <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl space-y-6">
                <h3 className="font-nunito text-xl font-bold flex items-center gap-2 text-[#7BAFD4]">
                  <Sparkles className="w-5 h-5" /> Gemini Travel Coordinator
                </h3>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  if (!aiPrompt.trim()) return;
                  setAiLoading(true);
                  setAiResponse('');
                  try {
                    const res = await fetch('/api/generate', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ prompt: `As the UNC SmartRide AI Coordinator, help this student: ${aiPrompt}` }),
                    });
                    const data = await res.json();
                    if (data.error) throw new Error(data.error);
                    setAiResponse(data.text);
                  } catch (err: any) {
                    setAiResponse(`Error: ${err.message}`);
                  } finally {
                    setAiLoading(false);
                  }
                }} className="space-y-4">
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="Ask Gemini to coordinate flight times or suggest the best RDU departure window..."
                    rows={3}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-white focus:border-[#7BAFD4] focus:outline-none resize-none"
                  />
                  <button
                    type="submit"
                    disabled={aiLoading}
                    className="w-full bg-[#7BAFD4] hover:bg-[#659bc2] text-[#00274C] font-nunito font-bold py-3 rounded-xl transition-colors cursor-pointer"
                  >
                    {aiLoading ? 'Analyzing travel times...' : 'Ask Gemini Assistant'}
                  </button>
                </form>

                {aiResponse && (
                  <div className="p-6 bg-slate-950 border border-slate-800 rounded-2xl">
                    <h4 className="text-xs uppercase font-bold text-slate-500 mb-2">Gemini Recommendation:</h4>
                    <div className="whitespace-pre-wrap text-slate-200 leading-relaxed text-sm">
                      {aiResponse}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="max-w-xl mx-auto bg-slate-900 border border-slate-800 p-8 rounded-3xl space-y-6">
                <h3 className="font-nunito text-2xl font-bold text-[#7BAFD4] flex items-center gap-2">
                  <User className="w-6 h-6" /> Profile & Account Settings
                </h3>
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div>
                    <label className="block text-xs uppercase font-bold text-slate-400 mb-1">Display Name (Shown on Bulletin)</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase font-bold text-slate-400 mb-1">Phone Number (Optional for coordination)</label>
                    <input
                      type="text"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="(919) 000-0000"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs uppercase font-bold text-slate-400 mb-1">UNC ONYEN Email (Read-only)</label>
                    <input
                      type="email"
                      disabled
                      value={user.email}
                      className="w-full bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-slate-400 text-sm cursor-not-allowed"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-[#7BAFD4] hover:bg-[#659bc2] text-[#00274C] font-nunito font-bold py-3 rounded-xl transition-colors cursor-pointer shadow"
                  >
                    Save Profile Changes
                  </button>
                </form>

                <div className="pt-6 border-t border-slate-800 flex justify-between items-center">
                  <div>
                    <p className="font-nunito font-bold text-white">Sign out of your session</p>
                    <p className="text-xs text-slate-400">Log out securely from this device.</p>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-800 px-4 py-2 rounded-xl text-xs font-nunito transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}