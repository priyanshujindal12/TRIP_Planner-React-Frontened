/* Admin.jsx – redesigned for JSX (no TS) */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '@fortawesome/fontawesome-free/css/all.min.css';

const AdminDashboard = () => {
  const navigate = useNavigate();

  /* ────── STATE ────── */
  const [currentUser, setCurrentUser] = useState(null);
  const [currentTab, setCurrentTab] = useState('overview');
  const [users, setUsers] = useState([]);
  const [trips, setTrips] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [activeFilter, setActiveFilter] = useState({ trips: 'all', bookings: 'all' });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [dashboardStats, setDashboardStats] = useState({
    totalUsers: 0,
    totalTrips: 0,
    totalBookings: 0,
    activeTrips: 0,
  });

  const API_BASE = 'http://localhost:3000';

  /* ────── AUTH HELPERS ────── */
  const validateToken = useCallback((response) => {
    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem('token');
      localStorage.removeItem('userEmail');
      navigate('/login');
      return false;
    }
    return true;
  }, [navigate]);

  const showNotification = useCallback((message, type = 'info') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 5000);
  }, []);

  const fetchWithAuth = useCallback(async (url, options = {}) => {
    const token = localStorage.getItem('token');
    if (!token) { navigate('/login'); return null; }
    const response = await fetch(url, {
      ...options,
      headers: { ...options.headers, Authorization: `Bearer ${token}` },
    });
    if (!validateToken(response)) return null;
    return response;
  }, [navigate, validateToken]);

  /* ────── DATA LOADERS ────── */
  const loadUserData = useCallback(async () => {
    try {
      const response = await fetchWithAuth(`${API_BASE}/user/dashboard-data`);
      if (!response) return;
      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data);
        localStorage.setItem('userEmail', data.email);
      }
    } catch (e) { console.error(e); }
  }, [fetchWithAuth]);

  const loadAdminData = useCallback(async () => {
    try {
      const [u, t, b] = await Promise.all([
        fetchWithAuth(`${API_BASE}/admin/users`),
        fetchWithAuth(`${API_BASE}/admin/trips`),
        fetchWithAuth(`${API_BASE}/admin/bookings`),
      ]);

      if (u?.ok) setUsers((await u.json()).users ?? []);
      if (t?.ok) setTrips((await t.json()).trips ?? []);
      if (b?.ok) setBookings((await b.json()).bookings ?? []);

      updateDashboardStats();
    } catch (e) {
      console.error(e);
      showNotification('Failed to load admin data', 'error');
    }
  }, [fetchWithAuth, showNotification]);

  const updateDashboardStats = useCallback(() => {
    setDashboardStats({
      totalUsers: users.length,
      totalTrips: trips.length,
      totalBookings: bookings.length,
      activeTrips: trips.filter(t => ['upcoming', 'ongoing'].includes(t.status)).length,
    });
  }, [users, trips, bookings]);

  /* ────── UI HELPERS ────── */
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    showNotification('Logged out successfully', 'success');
    setTimeout(() => navigate('/login'), 800);
  };

  const getFilteredTrips = () => activeFilter.trips === 'all' ? trips : trips.filter(t => t.status === activeFilter.trips);
  const getFilteredBookings = () => activeFilter.bookings === 'all' ? bookings : bookings.filter(b => b.bookingStatus === activeFilter.bookings);
  const toggleSidebar = () => setIsSidebarOpen(v => !v);

  const getUserDisplayName = () => currentUser?.email?.split('@')[0]?.charAt(0).toUpperCase() + currentUser?.email?.split('@')[0]?.slice(1) || 'Admin';
  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };
  const getTransportIcon = (mode) => ({ bus: 'fa-bus', railway: 'fa-train', airplane: 'fa-plane', car: 'fa-car' }[mode] ?? 'fa-car');

  /* ────── LIFECYCLE ────── */
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { navigate('/login'); return; }
    loadUserData();
    loadAdminData();

    const iv = setInterval(loadAdminData, 5 * 60 * 1000);
    return () => clearInterval(iv);
  }, [loadUserData, loadAdminData, navigate]);

  useEffect(() => updateDashboardStats(), [users, trips, bookings, updateDashboardStats]);

  /* ────── PARTICLE BACKGROUND ────── */
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const count = Math.min(120, Math.floor((canvas.width * canvas.height) / 12000));

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        radius: Math.random() * 1.8 + 0.8,
      });
    }

    let animationId;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(139,92,246,0.45)';
        ctx.fill();
      });
      animationId = requestAnimationFrame(animate);
    };
    animate();

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  /* ────── RENDER ────── */
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0f1220] text-white font-['Poppins',sans-serif]">
      {/* PARTICLE CANVAS */}
      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0 opacity-60" />

      {/* NOTIFICATIONS */}
      <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 max-w-[90%] sm:max-w-md">
        {notifications.map(n => (
          <div
            key={n.id}
            className={`flex items-center gap-3 px-5 py-3 rounded-xl backdrop-blur-xl border border-white/10 animate-bounceIn shadow-lg ${
              n.type === 'success' ? 'bg-green-600/90' :
              n.type === 'warning' ? 'bg-amber-600/90' :
              n.type === 'error' ? 'bg-red-600/90' : 'bg-violet-600/90'
            }`}
          >
            <i className={`fas fa-${n.type === 'success' ? 'check-circle' : n.type === 'warning' ? 'exclamation-triangle' : n.type === 'error' ? 'times-circle' : 'info-circle'} text-lg`} />
            <span className="text-sm font-medium">{n.message}</span>
            <button onClick={() => setNotifications(p => p.filter(x => x.id !== n.id))} className="ml-auto text-lg hover:opacity-70">×</button>
          </div>
        ))}
      </div>

      {/* SIDEBAR */}
      <nav className={`fixed inset-y-0 left-0 w-72 bg-[rgba(20,22,34,0.92)] backdrop-blur-xl border-r border-white/10 z-40 flex flex-col transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full sm:translate-x-0'}`}>
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div className="flex items-center gap-3 font-bold text-xl cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-10 h-10 grid place-items-center rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 shadow-lg">
              <i className="fas fa-user-shield text-lg" />
            </div>
            <span>Admin Panel</span>
          </div>
          <button className="sm:hidden text-2xl" onClick={toggleSidebar}>×</button>
        </div>

        <ul className="flex-1 py-6">
          {[
            { id: 'overview', icon: 'fa-chart-line', label: 'Overview' },
            { id: 'users', icon: 'fa-users', label: 'Users' },
            { id: 'trips', icon: 'fa-route', label: 'Trips' },
            { id: 'bookings', icon: 'fa-ticket-alt', label: 'Bookings' },
          ].map(item => (
            <li key={item.id} className="my-1">
              <button
                onClick={() => { setCurrentTab(item.id); setIsSidebarOpen(false); }}
                className={`flex items-center gap-4 w-full px-6 py-3.5 text-left transition-all rounded-r-full mr-4 ${
                  currentTab === item.id
                    ? 'bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-lg translate-x-1'
                    : 'text-gray-400 hover:bg-white/8 hover:text-white hover:translate-x-1'
                }`}
              >
                <i className={`fas ${item.icon} w-5 text-center`} />
                <span>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>

        <div className="p-5 border-t border-white/10">
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 text-white font-semibold hover:-translate-y-1 hover:shadow-xl transition-all">
            <i className="fas fa-sign-out-alt" />
            <span>Logout</span>
          </button>
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <main className={`ml-0 sm:ml-72 min-h-screen transition-all duration-300 relative z-10`}>
        {/* MOBILE HAMBURGER */}
        <button className="sm:hidden fixed top-4 left-4 z-50 p-2.5 rounded-lg bg-violet-600 text-white shadow-lg" onClick={toggleSidebar}>
          <i className="fas fa-bars text-lg" />
        </button>

        {/* HEADER */}
        <header className="sticky top-0 z-40 bg-[rgba(20,22,34,0.9)] backdrop-blur-xl border-b border-white/10 shadow-lg px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <div className="flex items-center gap-4">
            <div className="relative cursor-pointer p-2 rounded-full hover:bg-white/8 transition">
              <i className="fas fa-bell text-lg text-gray-300" />
              {bookings.filter(b => b.bookingStatus === 'pending').length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-xs px-2 py-0.5 rounded-full min-w-[20px] font-semibold">
                  {bookings.filter(b => b.bookingStatus === 'pending').length}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 px-4 py-2 rounded-full border border-white/10 hover:bg-white/8 transition">
              <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80" alt="profile" className="w-9 h-9 rounded-full object-cover border-2 border-violet-500" />
              <span className="font-semibold">{getUserDisplayName()}</span>
            </div>
          </div>
        </header>

        <div className="p-6 space-y-12">

          {/* OVERVIEW */}
          {currentTab === 'overview' && (
            <div className="space-y-12 animate-fadeIn">
              {/* Welcome Card */}
              <section className="bg-[rgba(255,255,255,0.06)] backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
                <h2 className="text-3xl font-bold mb-2">{getGreeting()}, {getUserDisplayName()}!</h2>
                <p className="text-gray-400 mb-8">Monitor & manage the platform with ease.</p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  {[
                    { label: 'Total Users', value: dashboardStats.totalUsers, icon: 'fa-users' },
                    { label: 'Total Trips', value: dashboardStats.totalTrips, icon: 'fa-route' },
                    { label: 'Total Bookings', value: dashboardStats.totalBookings, icon: 'fa-ticket-alt' },
                    { label: 'Active Trips', value: dashboardStats.activeTrips, icon: 'fa-fire' },
                  ].map((s, i) => (
                    <div key={i} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 text-center hover:-translate-y-1 hover:shadow-xl transition-all">
                      <i className={`fas ${s.icon} text-3xl mb-2 text-violet-400`} />
                      <div className="text-2xl font-bold">{s.value}</div>
                      <div className="text-sm text-gray-400">{s.label}</div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Quick Stats */}
              <section>
                <h3 className="text-2xl font-bold mb-6">Quick Stats</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { title: 'Pending Bookings', value: bookings.filter(b => b.bookingStatus === 'pending').length, icon: 'fa-clock', color: 'amber' },
                    { title: 'Upcoming Trips', value: trips.filter(t => t.status === 'upcoming').length, icon: 'fa-calendar-check', color: 'cyan' },
                    { title: 'Completed Trips', value: trips.filter(t => t.status === 'completed').length, icon: 'fa-check-circle', color: 'green' },
                  ].map((s, i) => (
                    <div key={i} className="group bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:-translate-y-2 hover:shadow-2xl transition-all">
                      <div className={`w-12 h-12 bg-${s.color}-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition`}>
                        <i className={`fas ${s.icon} text-white`} />
                      </div>
                      <h4 className="text-3xl font-bold">{s.value}</h4>
                      <p className="text-gray-400">{s.title}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {/* USERS */}
          {currentTab === 'users' && (
            <div className="animate-fadeIn">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">All Users</h2>
                <span className="text-sm text-gray-400">Total: {users.length}</span>
              </div>
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-violet-600 to-cyan-500">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold">#</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold">Email</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold">Role</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {users.map((u, i) => (
                        <tr key={u._id ?? i} className="hover:bg-white/8 transition">
                          <td className="px-6 py-4 text-sm">{i + 1}</td>
                          <td className="px-6 py-4 text-sm">{u.email}</td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${u.isAdmin ? 'bg-violet-600 text-white' : 'bg-cyan-600 text-white'}`}>
                              {u.isAdmin ? 'Admin' : 'User'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TRIPS */}
          {currentTab === 'trips' && (
            <div className="animate-fadeIn space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <h2 className="text-2xl font-bold">All Trips</h2>
                <div className="flex gap-2 flex-wrap">
                  {['all', 'upcoming', 'ongoing', 'completed', 'cancelled'].map(f => (
                    <button
                      key={f}
                      onClick={() => setActiveFilter({ ...activeFilter, trips: f })}
                      className={`px-4 py-2 rounded-full text-sm transition-all ${
                        activeFilter.trips === f
                          ? 'bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-lg'
                          : 'bg-white/8 text-gray-400 border border-white/12 hover:border-violet-500 hover:text-white'
                      }`}
                    >
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {getFilteredTrips().map(t => (
                  <div key={t._id} className="group bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl overflow-hidden shadow-lg hover:-translate-y-2 hover:shadow-2xl transition-all">
                    {t.image && (
                      <div className="h-48 overflow-hidden">
                        <img src={t.image} alt={t.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" onError={e => (e.currentTarget.style.display = 'none')} />
                      </div>
                    )}
                    <div className="p-5 space-y-3">
                      <div className="flex justify-between items-start">
                        <h3 className="text-lg font-semibold">{t.title}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          t.status === 'upcoming' ? 'bg-cyan-600/90' :
                          t.status === 'ongoing' ? 'bg-amber-600/90' :
                          t.status === 'completed' ? 'bg-green-600/90' :
                          'bg-red-600/90'
                        } text-white`}>{t.status}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm text-gray-400">
                        <div className="flex items-center gap-2"><i className="fas fa-map-marker-alt text-violet-400" />{t.from} to {t.to}</div>
                        <div className="flex items-center gap-2"><i className="fas fa-calendar text-violet-400" />{new Date(t.startDate).toLocaleDateString()} - {new Date(t.endDate).toLocaleDateString()}</div>
                        <div className="flex items-center gap-2"><i className="fas fa-users text-violet-400" />{t.seats} seats</div>
                        <div className="flex items-center gap-2"><i className="fas fa-dollar-sign text-violet-400" />${t.pricePerPerson}/person</div>
                        <div className="flex items-center gap-2"><i className={`fas ${getTransportIcon(t.modeOfTransport)} text-violet-400`} />{t.modeOfTransport}</div>
                        <div className="flex items-center gap-2"><i className="fas fa-user text-violet-400" />{t.createdBy?.email}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* BOOKINGS */}
          {currentTab === 'bookings' && (
            <div className="animate-fadeIn space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <h2 className="text-2xl font-bold">All Bookings</h2>
                <div className="flex gap-2 flex-wrap">
                  {['all', 'pending', 'accepted', 'rejected'].map(f => (
                    <button
                      key={f}
                      onClick={() => setActiveFilter({ ...activeFilter, bookings: f })}
                      className={`px-4 py-2 rounded-full text-sm transition-all ${
                        activeFilter.bookings === f
                          ? 'bg-gradient-to-r from-violet-600 to-cyan-500 text-white shadow-lg'
                          : 'bg-white/8 text-gray-400 border border-white/12 hover:border-violet-500 hover:text-white'
                      }`}
                    >
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-violet-600 to-cyan-500">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold">Trip</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold">Route</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold">Booked By</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold">Seats</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold">Status</th>
                        <th className="px-6 py-4 text-left text-sm font-semibold">Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {getFilteredBookings().map((b, i) => (
                        <tr key={i} className="hover:bg-white/8 transition">
                          <td className="px-6 py-4">{b.tripTitle}</td>
                          <td className="px-6 py-4 text-gray-400">{b.from} to {b.to}</td>
                          <td className="px-6 py-4 text-gray-400">{b.bookedBy}</td>
                          <td className="px-6 py-4">{b.seatsBooked}</td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              b.bookingStatus === 'pending' ? 'bg-amber-600/90' :
                              b.bookingStatus === 'accepted' ? 'bg-green-600/90' :
                              'bg-red-600/90'
                            } text-white`}>{b.bookingStatus}</span>
                          </td>
                          <td className="px-6 py-4 font-medium">${(b.pricePerPerson * b.seatsBooked).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* GLOBAL ANIMATIONS */}
      <style>{`
        @keyframes bounceIn {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.05); }
          70% { transform: scale(0.9); }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-bounceIn { animation: bounceIn 0.5s ease-out; }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.6s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default AdminDashboard;