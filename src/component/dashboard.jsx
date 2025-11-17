// Dashboard.jsx
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '@fortawesome/fontawesome-free/css/all.min.css';
import ChatWidget from './Chat';
const Dashboard = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [currentTab, setCurrentTab] = useState('overview');
  const [myTrips, setMyTrips] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [availableTrips, setAvailableTrips] = useState([]);
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [searchResults, setSearchResults] = useState(null);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [dashboardStats, setDashboardStats] = useState({
    totalTrips: 0,
    totalBookings: 0,
    upcomingTrips: 0,
    pendingBookings: 0,
  });
  const [activeFilter, setActiveFilter] = useState({ trips: 'all', bookings: 'all' });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [openTripId, setOpenTripId] = useState(null);
  const [flipped, setFlipped] = useState(() => new Set());

  const API_BASE = 'http://localhost:3000';
  const decodeToken = useCallback(() => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return null;
      const parts = token.split('.');
      if (parts.length < 2) return null;
      const payload = parts[1];
      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      const json = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(json);
    } catch (e) {
      return null;
    }
  }, []);

  const validateToken = useCallback(
    (response) => {
      if (!response) return false;
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('userEmail');
        navigate('/login');
        return false;
      }
      return true;
    },
    [navigate]
  );

  const showNotification = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setNotifications((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 5000);
  }, []);

  const fetchWithAuth = useCallback(
    async (url, options = {}) => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return null;
      }
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            ...(options.headers || {}),
            Authorization: `Bearer ${token}`,
          },
        });
        if (!validateToken(response)) return null;
        return response;
      } catch (err) {
        console.error('fetchWithAuth error', err);
        throw err;
      }
    },
    [navigate, validateToken]
  );

  /* ===================== DATA LOADERS ===================== */

  const loadUserData = useCallback(async () => {
    try {
      const decoded = decodeToken();
      if (decoded && (decoded.id || decoded.email || decoded._id)) {
        setCurrentUser({ _id: decoded.id || decoded._id || decoded.userId, email: decoded.email });
        if (decoded.email) localStorage.setItem('userEmail', decoded.email);
        return;
      }
      const resp = await fetchWithAuth(`${API_BASE}/user/dashboard-data`);
      if (!resp) return;
      if (resp.ok) {
        const data = await resp.json();
        setCurrentUser({ _id: data._id || data.id || data.user?._id, email: data.email || data.user?.email });
        if (data.email) localStorage.setItem('userEmail', data.email);
      }
    } catch (err) {
      console.error('loadUserData error', err);
    }
  }, [API_BASE, decodeToken, fetchWithAuth]);

  const loadMyTrips = useCallback(async () => {
    try {
      const resp = await fetchWithAuth(`${API_BASE}/trips/my-trips`);
      if (!resp) return;
      if (resp.ok) {
        const data = await resp.json();
        setMyTrips(data.trips || []);
      }
    } catch (err) {
      console.error('loadMyTrips error', err);
    }
  }, [API_BASE, fetchWithAuth]);

  const loadMyBookings = useCallback(async () => {
    try {
      const resp = await fetchWithAuth(`${API_BASE}/trips/my-booking`);
      if (!resp) return;
      if (resp.ok) {
        const data = await resp.json();
        setMyBookings(data.bookings || []);
      }
    } catch (err) {
      console.error('loadMyBookings error', err);
    }
  }, [API_BASE, fetchWithAuth]);

  const loadAvailableTrips = useCallback(async () => {
    try {
      const resp = await fetchWithAuth(`${API_BASE}/trips/all`);
      if (!resp) return;
      if (resp.ok) {
        const data = await resp.json();
        setAvailableTrips(data.trips || []);
      }
    } catch (err) {
      console.error('loadAvailableTrips error', err);
    }
  }, [API_BASE, fetchWithAuth]);

  const loadDashboardData = useCallback(async () => {
    await Promise.all([loadMyTrips(), loadMyBookings(), loadAvailableTrips()]);
  }, [loadMyTrips, loadMyBookings, loadAvailableTrips]);

  const updateDashboardStats = useCallback(() => {
    const totalTrips = myTrips.length;
    const upcomingTrips = myTrips.filter((t) => t.status === 'upcoming').length;
    const totalBookings = myBookings.length;
    const pendingBookings =
      myBookings.filter((b) => b.status === 'pending').length +
      myTrips.reduce((acc, t) => acc + (Array.isArray(t.bookings) ? t.bookings.filter((b) => b.status === 'pending').length : 0), 0);

    setDashboardStats({ totalTrips, totalBookings, upcomingTrips, pendingBookings });
  }, [myTrips, myBookings]);

  /* ===================== TRIP CREATION ===================== */
  const handleTripCreation = async (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const tripData = Object.fromEntries(formData.entries());

    if (!tripData.title || tripData.title.trim().length < 3) {
      showNotification('Please enter a trip title (min 3 chars)', 'warning');
      return;
    }

    const parseLocalDateTime = (value) => {
      const [datePart, timePart] = value.split('T');
      const [year, month, day] = datePart.split('-').map(Number);
      const [hour, minute] = timePart.split(':').map(Number);
      return new Date(year, month - 1, day, hour, minute).toISOString();
    };

    try {
      tripData.startDate = parseLocalDateTime(tripData.startDate);
      tripData.endDate = parseLocalDateTime(tripData.endDate);
      tripData.seats = parseInt(tripData.seats, 10);
      tripData.pricePerPerson = parseFloat(tripData.pricePerPerson);

      const response = await fetchWithAuth(`${API_BASE}/trips/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tripData),
      });
      if (!response) return;
      const result = await response.json();
      if (response.ok && result.success) {
        showNotification('Trip created successfully!', 'success');
        form.reset();
        await loadDashboardData();
        setCurrentTab('trips');
      } else {
        showNotification(result.message || 'Failed to create trip', 'error');
      }
    } catch (error) {
      console.error('handleTripCreation error:', error);
      showNotification('Failed to create trip', 'error');
    }
  };

  /* ===================== PAYMENT & JOIN ===================== */
  const handleJoinTrip = async (seatsBooked) => {
    try {
      if (!selectedTripId) {
        showNotification('No trip selected', 'warning');
        return;
      }
      const orderResponse = await fetchWithAuth(`${API_BASE}/payment/create-order/${selectedTripId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seatsBooked: parseInt(seatsBooked, 10) }),
      });
      if (!orderResponse) return;
      if (!orderResponse.ok) {
        const err = await orderResponse.json().catch(() => null);
        showNotification(err?.message || 'Failed to initiate payment', 'error');
        return;
      }
      const orderData = await orderResponse.json();

      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: 'INR',
        name: 'Ghumakkad - Trip Booking',
        description: orderData.tripTitle || 'Trip Booking',
        order_id: orderData.orderId,
        handler: async function (response) {
          try {
            const joinResponse = await fetchWithAuth(`${API_BASE}/trips/${selectedTripId}/join`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ seatsBooked: parseInt(seatsBooked, 10) }),
            });

            if (joinResponse.ok) {
              showNotification('Successfully joined trip! Awaiting approval.', 'success');
              setShowJoinModal(false);
              await loadDashboardData();
              setCurrentTab('bookings');
            } else {
              const error = await joinResponse.json();
              showNotification(error.message || 'Failed to join trip', 'error');
            }
          } catch (joinError) {
            console.error('Error after payment:', joinError);
            showNotification('Error while joining after payment', 'error');
          }
        },
        theme: { color: '#7C3AED' },
      };

      if (!window.Razorpay) {
        showNotification('Razorpay SDK not loaded', 'error');
        return;
      }
      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error('handleJoinTrip error:', error);
      showNotification('Payment initiation failed', 'error');
    }
  };

  /* ===================== CANCEL ===================== */
  const cancelTrip = async (tripId) => {
    try {
      const response = await fetchWithAuth(`${API_BASE}/trips/${tripId}/cancel`, {
        method: 'POST',
      });
      if (!response) return;
      if (response.ok) {
        showNotification('Trip cancelled successfully', 'success');
        await loadDashboardData();
      } else {
        const error = await response.json();
        showNotification(error.message || 'Failed to cancel trip', 'error');
      }
    } catch (error) {
      showNotification('Failed to cancel trip', 'error');
    }
  };

  const cancelBooking = async (bookingId) => {
    try {
      const response = await fetchWithAuth(`${API_BASE}/trips/${bookingId}/cancel-booking`, {
        method: 'POST',
      });
      if (!response) return;
      if (response.ok) {
        showNotification('Booking cancelled successfully', 'success');
        await loadDashboardData();
      } else {
        const error = await response.json();
        showNotification(error.message || 'Failed to cancel booking', 'error');
      }
    } catch (error) {
      showNotification('Failed to cancel booking', 'error');
    }
  };

  /* ===================== ACCEPT / REJECT ===================== */
  const acceptBooking = async (tripId, bookingId) => {
    try {
      const response = await fetchWithAuth(`${API_BASE}/trips/${tripId}/booking/${bookingId}/accept`, {
        method: 'POST',
      });
      if (!response) return;
      if (response.ok) {
        showNotification('Booking accepted successfully', 'success');
        await loadDashboardData();
      } else {
        const error = await response.json();
        showNotification(error.message || 'Failed to accept booking', 'error');
      }
    } catch (error) {
      console.error('acceptBooking error:', error);
      showNotification('Failed to accept booking', 'error');
    }
  };

  const rejectBooking = async (tripId, bookingId) => {
    try {
      const response = await fetchWithAuth(`${API_BASE}/trips/${tripId}/bookings/${bookingId}/reject`, {
        method: 'POST',
      });
      if (!response) return;
      if (response.ok) {
        showNotification('Booking rejected successfully', 'success');
        await loadDashboardData();
      } else {
        const error = await response.json();
        showNotification(error.message || 'Failed to reject booking', 'error');
      }
    } catch (error) {
      console.error('rejectBooking error:', error);
      showNotification('Failed to reject booking', 'error');
    }
  };

  /* ===================== SEARCH ===================== */
  const performSearch = useCallback(
    async (query) => {
      if (!query || query.length < 2) {
        showNotification('Please enter at least 2 characters to search', 'warning');
        setSearchResults(null);
        setShowSearchModal(false);
        return;
      }
      try {
        setIsSearching(true);
        const response = await fetch(`${API_BASE}/trips/search-places?city=${encodeURIComponent(query)}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        if (!validateToken(response)) return;
        if (!response.ok) {
          throw new Error(`Search failed with status ${response.status}`);
        }
        const data = await response.json();
        let places = data.places || data.results || [];
        if (!Array.isArray(places)) {
          showNotification('No valid places found', 'info');
          setSearchResults(null);
          setShowSearchModal(false);
          return;
        }
        places = places.slice(0, 10).map((place) => ({
          name: place.name || 'Unknown Place',
          address: place.address || place.location || 'No address available',
          image: place.image || place.photo || null,
          rating: place.rating && !isNaN(place.rating) ? parseFloat(place.rating) : null,
        }));
        if (places.length > 0) {
          setSearchResults({ places, city: query });
          setShowSearchModal(true);
        } else {
          showNotification(`No places found for "${query}"`, 'info');
          setSearchResults(null);
          setShowSearchModal(false);
        }
      } catch (error) {
        console.error('Search error:', error);
        showNotification('Search failed. Please try again.', 'error');
        setSearchResults(null);
        setShowSearchModal(false);
      } finally {
        setIsSearching(false);
      }
    },
    [showNotification, validateToken]
  );

  const handleSearchInput = useCallback(
    (e) => {
      const query = e.target.value;
      setSearchQuery(query);
      clearTimeout(window.searchTimeout);
      window.searchTimeout = setTimeout(() => {
        performSearch(query.trim());
      }, 1200);
    },
    [performSearch]
  );

  const handleSearchSubmit = useCallback(
    (e) => {
      e.preventDefault();
      performSearch(searchQuery.trim());
    },
    [searchQuery, performSearch]
  );

  /* ===================== FILTER HELPERS ===================== */
  const getFilteredTrips = () => {
    if (activeFilter.trips === 'all') return myTrips.filter((trip) => trip.status !== 'cancelled');
    return myTrips.filter((trip) => trip.status === activeFilter.trips);
  };

  const getFilteredBookings = () => {
    if (activeFilter.bookings === 'all') return myBookings;
    return myBookings.filter((booking) => {
      if (activeFilter.bookings === 'upcoming') return booking.isUpcoming;
      if (activeFilter.bookings === 'past') return booking.isPast;
      if (activeFilter.bookings === 'cancelled') return booking.isCancelled;
      return true;
    });
  };

  const getTransportIcon = (mode) => {
    const icons = { bus: 'fa-bus', railway: 'fa-train', airplane: 'fa-plane', car: 'fa-car' };
    return icons[mode] || 'fa-car';
  };

  const getBookingStatus = (booking) => {
    if (booking.status === 'rejected') return 'rejected';
    if (booking.isCancelled) return 'cancelled';
    if (booking.isPast) return 'completed';
    if (booking.isUpcoming) return 'upcoming';
    return booking.status || 'unknown';
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    showNotification('Successfully logged out!', 'success');
    setTimeout(() => navigate('/login'), 1000);
  };

  const toggleSidebar = () => setIsSidebarOpen((v) => !v);

  const getUserDisplayName = () => {
    if (!currentUser?.email) return 'Traveler';
    const username = currentUser.email.split('@')[0];
    return username.charAt(0).toUpperCase() + username.slice(1);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  /* ===================== LIFECYCLE ===================== */
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    loadUserData();
    loadDashboardData();

    const refreshInterval = setInterval(loadDashboardData, 5 * 60 * 1000);
    return () => clearInterval(refreshInterval);
  }, [loadDashboardData, loadUserData, navigate]);

  useEffect(() => {
    updateDashboardStats();
  }, [myTrips, myBookings, updateDashboardStats]);

  /* ===================== PARTICLE BACKGROUND (from Admin.jsx) ===================== */
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const setSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    setSize();

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
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(139,92,246,0.45)'; // purple-ish color to match Admin.jsx
        ctx.fill();
      });
      animationId = requestAnimationFrame(animate);
    };
    animate();

    const onResize = () => setSize();
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  /* ===================== FLIP HELPERS ===================== */
  const toggleFlip = (tripId) => {
    setFlipped((prev) => {
      const cp = new Set(prev);
      if (cp.has(tripId)) cp.delete(tripId);
      else cp.add(tripId);
      return cp;
    });
  };

  /* ===================== UTILITY FLAGS ===================== */
  const isTripCancelable = (trip) => {
    // allow cancel only when status is 'upcoming'
    return trip && trip.status === 'upcoming';
  };

const canCancelBooking = (booking) => {
  const now = new Date();
  const tripStart = new Date(booking.startDate);

  return (
    booking.status === "pending" &&   // user has not been accepted/rejected
    tripStart > now                   // trip not started yet
  );
};





  /* ===================== RENDER ===================== */
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0f1220] text-white font-['Poppins',system-ui,sans-serif]">
      {/* Particle background canvas */}

      <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0 opacity-60" />

      {/* Notifications */}
      <div className="fixed top-5 right-5 z-[10000] flex flex-col gap-2 max-w-[90%] sm:max-w-[420px]">
        {notifications.map((notif) => (
          <div
            key={notif.id}
            className={`flex items-center gap-3 px-4 py-3 sm:px-6 sm:py-4 rounded-xl shadow-2xl backdrop-blur-xl border border-white/10 text-white animate-bounceIn ${notif.type === 'success'
              ? 'bg-green-600/90'
              : notif.type === 'warning'
                ? 'bg-amber-600/90'
                : notif.type === 'error'
                  ? 'bg-red-600/90'
                  : 'bg-violet-600/90'
              }`}
          >
            <i
              className={`fas fa-${notif.type === 'success'
                ? 'check-circle'
                : notif.type === 'warning'
                  ? 'exclamation-triangle'
                  : notif.type === 'error'
                    ? 'times-circle'
                    : 'info-circle'
                }`}
            />
            <span className="text-sm sm:text-base">{notif.message}</span>
            <button
              onClick={() => setNotifications((prev) => prev.filter((n) => n.id !== notif.id))}
              className="ml-2 text-lg sm:text-xl hover:opacity-80"
              aria-label="dismiss notification"
            >
              &times;
            </button>
          </div>
        ))}
      </div>

      {/* Sidebar */}
      <nav
        className={`fixed top-0 left-0 h-screen w-64 sm:w-72 bg-[rgba(255,255,255,0.06)] backdrop-blur-xl border-r border-[rgba(255,255,255,0.1)] z-[1000] shadow-[0_10px_30px_rgba(0,0,0,0.35)] flex flex-col transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full sm:translate-x-0'
          }`}
      >
        <div className="p-4 sm:p-6 border-b border-[rgba(255,255,255,0.1)] flex items-center justify-between">
          <div
            className="flex items-center gap-2 sm:gap-3 font-bold text-xl sm:text-2xl text-white cursor-pointer"
            onClick={() => navigate('/')}
          >
            <div className="w-9 h-9 bg-gradient-to-br from-violet-600 to-cyan-500 rounded-xl flex items-center justify-center shadow-[0_6px_16px_rgba(124,58,237,0.45)]">
              <i className="fas fa-map-marked-alt text-white"></i>
            </div>
            <span>Ghumakkad</span>
          </div>
          <button onClick={toggleSidebar} className="sm:hidden text-white hover:text-cyan-500" aria-label="close menu">
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6">
            <div className="text-center mb-6 sm:mb-8">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-violet-600 to-cyan-500 rounded-full mx-auto mb-3 sm:mb-4 flex items-center justify-center shadow-[0_10px_24px_rgba(124,58,237,0.35)]">
                <i className="fas fa-user text-white text-xl sm:text-2xl"></i>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white mb-1">{getUserDisplayName()}</h3>
              <p className="text-xs sm:text-sm text-[#a9b1c3]">{getGreeting()}</p>
            </div>

            <nav className="space-y-1">
              {[
                { id: 'overview', label: 'Overview', icon: 'fa-chart-line' },
                { id: 'trips', label: 'My Trips', icon: 'fa-route' },
                { id: 'bookings', label: 'My Bookings', icon: 'fa-calendar-check' },
                { id: 'discover', label: 'Discover Trips', icon: 'fa-search-location' },
                { id: 'create', label: 'Create Trip', icon: 'fa-plus' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentTab(item.id);
                    if (window.innerWidth < 640) setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${currentTab === item.id
                    ? 'bg-gradient-to-br from-violet-600 to-cyan-500 text-white shadow-[0_10px_24px_rgba(124,58,237,0.35)]'
                    : 'text-[#a9b1c3] hover:bg-[rgba(255,255,255,0.08)] hover:text-white'
                    }`}
                >
                  <i className={`fas ${item.icon} w-5`}></i>
                  <span className="font-medium">{item.label}</span>
                </button>
              ))}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-[#a9b1c3] hover:bg-red-600/20 hover:text-red-400 transition-all mt-4"
              >
                <i className="fas fa-sign-out-alt w-5"></i>
                <span className="font-medium">Logout</span>
              </button>
            </nav>
          </div>
        </div>
      </nav>

      {/* Mobile overlay */}
      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-[999] sm:hidden" onClick={toggleSidebar} />}

      {/* Mobile hamburger */}
      <button
        onClick={toggleSidebar}
        className="sm:hidden fixed top-5 left-5 z-[1001] w-12 h-12 bg-[rgba(255,255,255,0.08)] backdrop-blur-xl border border-[rgba(255,255,255,0.1)] rounded-xl flex items-center justify-center text-white shadow-lg"
        aria-label="open menu"
      >
        <i className="fas fa-bars text-xl"></i>
      </button>

      {/* Main content */}
      <main className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'ml-0 sm:ml-0' : 'ml-0 sm:ml-72'} overflow-y-auto z-10`}>
        <div className="p-4 sm:p-6 md:p-8">
          {/* Overview */}
          {currentTab === 'overview' && (
            <>
              <div className="mb-6 sm:mb-8">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2 [text-shadow:2px_2px_8px_rgba(0,0,0,0.7)]">
                  Welcome back, {getUserDisplayName()}!
                </h1>
                <p className="text-[#a9b1c3] text-sm sm:text-base">{getGreeting()}! Here's what's happening with your trips.</p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-8">
                {[
                  { label: 'Total Trips', value: dashboardStats.totalTrips, icon: 'fa-route', color: 'from-blue-500 to-cyan-500' },
                  { label: 'Upcoming', value: dashboardStats.upcomingTrips, icon: 'fa-clock', color: 'from-green-500 to-emerald-500' },
                  { label: 'Total Bookings', value: dashboardStats.totalBookings, icon: 'fa-calendar-check', color: 'from-violet-600 to-purple-600' },
                  { label: 'Pending', value: dashboardStats.pendingBookings, icon: 'fa-hourglass-half', color: 'from-amber-500 to-orange-500' },
                ].map((stat, i) => (
                  <div key={i} className="bg-[rgba(255,255,255,0.06)] backdrop-blur-xl rounded-[22px] p-4 sm:p-6 border border-[rgba(255,255,255,0.1)] shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
                    <div className="flex items-center justify-between mb-2">
                      <i className={`fas ${stat.icon} text-2xl bg-gradient-to-br ${stat.color} bg-clip-text text-transparent`} />
                      <span className="text-[#a9b1c3] text-sm font-medium">{stat.label}</span>
                    </div>
                    <p className="text-2xl sm:text-3xl font-bold text-white">{stat.value}</p>
                  </div>
                ))}
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-8">
                <button
                  onClick={() => setCurrentTab('create')}
                  className="bg-[rgba(255,255,255,0.06)] backdrop-blur-xl border border-[rgba(255,255,255,0.1)] rounded-[22px] p-6 sm:p-8 text-center hover:bg-[rgba(255,255,255,0.08)] transition-all group shadow-[0_10px_30px_rgba(0,0,0,0.35)]"
                >
                  <i className="fas fa-plus text-3xl sm:text-4xl bg-gradient-to-br from-violet-600 to-purple-600 bg-clip-text text-transparent mb-3 sm:mb-4"></i>
                  <h3 className="text-lg sm:text-xl font-bold text-white mb-2">Create New Trip</h3>
                  <p className="text-[#a9b1c3] text-sm">Plan your next adventure</p>
                </button>

                <button
                  onClick={() => setCurrentTab('discover')}
                  className="bg-[rgba(255,255,255,0.06)] backdrop-blur-xl border border-[rgba(255,255,255,0.1)] rounded-[22px] p-6 sm:p-8 text-center hover:bg-[rgba(255,255,255,0.08)] transition-all group shadow-[0_10px_30px_rgba(0,0,0,0.35)]"
                >
                  <i className="fas fa-search-location text-3xl sm:text-4xl bg-gradient-to-br from-green-500 to-emerald-500 bg-clip-text text-transparent mb-3 sm:mb-4"></i>
                  <h3 className="text-lg sm:text-xl font-bold text-white mb-2">Discover Trips</h3>
                  <p className="text-[#a9b1c3] text-sm">Find trips to join</p>
                </button>

                <button
                  onClick={() => setCurrentTab('bookings')}
                  className="bg-[rgba(255,255,255,0.06)] backdrop-blur-xl border border-[rgba(255,255,255,0.1)] rounded-[22px] p-6 sm:p-8 text-center hover:bg-[rgba(255,255,255,0.08)] transition-all group shadow-[0_10px_30px_rgba(0,0,0,0.35)]"
                >
                  <i className="fas fa-calendar-check text-3xl sm:text-4xl bg-gradient-to-br from-violet-600 to-pink-500 bg-clip-text text-transparent mb-3 sm:mb-4"></i>
                  <h3 className="text-lg sm:text-xl font-bold text-white mb-2">My Bookings</h3>
                  <p className="text-[#a9b1c3] text-sm">Manage your reservations</p>
                </button>
              </div>

              {/* Recent Activity */}
              <div className="bg-[rgba(255,255,255,0.06)] backdrop-blur-xl rounded-[22px] border border-[rgba(255,255,255,0.1)] p-6 sm:p-8 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
                <h2 className="text-xl sm:text-2xl font-bold text-white mb-6">Recent Activity</h2>
                <div className="space-y-4">
                  {myBookings.slice(0, 3).map((booking, index) => (
                    <div key={index} className="flex items-center gap-4 p-4 bg-[rgba(255,255,255,0.04)] rounded-xl border border-[rgba(255,255,255,0.08)]">
                      <div className="w-12 h-12 bg-gradient-to-br from-violet-600 to-cyan-500 rounded-lg flex items-center justify-center shadow-[0_6px_16px_rgba(124,58,237,0.45)]">
                        <i className="fas fa-calendar text-white text-sm"></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{booking.title}</p>
                        <p className="text-[#a9b1c3] text-sm truncate">{booking.from} → {booking.to}</p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${booking.status === 'upcoming' ? 'bg-green-600/90 text-white' : 'bg-gray-600/90 text-white'
                          }`}
                      >
                        {booking.status}
                      </span>
                    </div>
                  ))}
                  {myBookings.length === 0 && <p className="text-center text-[#a9b1c3] py-8">No recent activity. Create or join a trip!</p>}
                </div>
              </div>
            </>
          )}

          {currentTab === 'trips' && (
            <>
              <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white m-0 [text-shadow:2px_2px_8px_rgba(0,0,0,0.7)]">
                    My Trips
                  </h2>
                  <p className="text-[#a9b1c3] text-sm sm:text-base mt-1">Trips you've created</p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={activeFilter.trips}
                    onChange={(e) =>
                      setActiveFilter((prev) => ({ ...prev, trips: e.target.value }))
                    }
                    className="px-3 py-2 bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.12)] rounded-xl text-white text-sm focus:outline-none focus:border-violet-500"
                  >
                    <option value="all" className="bg-[#0f1220] text-white">All Trips</option>
                    <option value="upcoming" className="bg-[#0f1220] text-white">Upcoming</option>
                    <option value="ongoing" className="bg-[#0f1220] text-white">Ongoing</option>
                    <option value="completed" className="bg-[#0f1220] text-white">Completed</option>
                  </select>
                </div>
              </div>

              {getFilteredTrips().length === 0 ? (
                <div className="text-center py-12 sm:py-16 bg-[rgba(255,255,255,0.04)] rounded-[22px] border border-[rgba(255,255,255,0.08)]">
                  <i className="fas fa-route text-5xl sm:text-6xl text-[#a9b1c3]/30 mb-4"></i>
                  <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">No trips yet</h3>
                  <p className="text-[#a9b1c3] mb-6">Create your first trip to get started!</p>
                  <button
                    onClick={() => setCurrentTab('create')}
                    className="px-6 py-3 bg-gradient-to-br from-violet-600 to-cyan-500 text-white rounded-xl font-semibold hover:scale-105 transition-all shadow-[0_10px_24px_rgba(124,58,237,0.35)]"
                  >
                    Create Trip
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {getFilteredTrips().map((trip) => (
                    <div
                      key={trip._id}
                      className="relative bg-[rgba(255,255,255,0.06)] backdrop-blur-xl border border-[rgba(255,255,255,0.1)]
                      rounded-2xl p-4 transition-all duration-300 hover:scale-[1.02]
                      hover:shadow-[0_10px_30px_rgba(0,0,0,0.3)]"
                    >
                      {/* Trip Image */}
                      {trip.image && (
                        <img
                          src={trip.image}
                          alt={trip.title}
                          className="w-full h-36 object-cover rounded-xl mb-3"
                        />
                      )}

                      {/* Trip Title & Status */}
                      <div className="flex justify-between items-center mb-2">
                        <h3 className="text-lg font-semibold text-white truncate">{trip.title}</h3>
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${trip.status === "upcoming"
                            ? "bg-green-600/80"
                            : trip.status === "ongoing"
                              ? "bg-amber-600/80"
                              : trip.status === "completed"
                                ? "bg-blue-600/80"
                                : "bg-gray-600/80"
                            } text-white`}
                        >
                          {trip.status}
                        </span>
                      </div>

                      {/* Basic Info */}
                      <div className="text-sm text-[#a9b1c3] space-y-1 mb-3">
                        <div className="flex items-center gap-2">
                          <i className="fas fa-map-marker-alt text-cyan-400 w-4"></i>
                          {trip.from} → {trip.to}
                        </div>
                        <div className="flex items-center gap-2">
                          <i className="fas fa-calendar text-cyan-400 w-4"></i>
                          {new Date(trip.startDate).toLocaleDateString()} -{" "}
                          {new Date(trip.endDate).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-2">
                          <i className={`fas ${getTransportIcon(trip.modeOfTransport)} text-cyan-400 w-4`} />
                          {trip.modeOfTransport || "Car"}
                        </div>
                      </div>

                      {/* Price & Seats */}
                      <div className="flex justify-between items-center text-sm border-t border-[rgba(255,255,255,0.08)] pt-2">
                        <span className="text-white font-bold">₹{trip.pricePerPerson}/person</span>
                        <span className="text-[#a9b1c3]">{trip.availableSeats} seats left</span>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex justify-between items-center mt-3">
                        <button
                          onClick={() => cancelTrip(trip._id)}
                          disabled={!isTripCancelable(trip)}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center gap-2 ${isTripCancelable(trip)
                            ? "bg-red-600/90 hover:bg-red-700 text-white"
                            : "bg-gray-600/50 text-gray-400 cursor-not-allowed"
                            } transition-all`}
                        >
                          <i className="fas fa-times"></i> Cancel
                        </button>

                        {/* Toggle Details */}
                        <button
                          onClick={() =>
                            setOpenTripId((prev) => (prev === trip._id ? null : trip._id))
                          }
                          className="text-xs text-cyan-400 hover:text-cyan-300"
                        >
                          <i
                            className={`fas ${openTripId === trip._id ? "fa-chevron-up" : "fa-chevron-down"
                              }`}
                          ></i>{" "}
                          Details
                        </button>
                      </div>

                      {/* Expanded Section (Weather + Bookings) */}
                      {openTripId === trip._id && (
                        <div className="mt-3 space-y-3 bg-[rgba(255,255,255,0.04)] p-3 rounded-xl border border-[rgba(255,255,255,0.08)] text-xs text-[#a9b1c3]">
                          {/* Weather */}
                          {trip.weather?.length > 0 ? (
                            <div>
                              <h4 className="text-white font-medium mb-1">Weather Forecast</h4>
                              <div className="flex gap-2 overflow-x-auto pb-1">
                                {trip.weather.map((w, i) => (
                                  <div
                                    key={i}
                                    className="flex flex-col items-center min-w-[60px] bg-[rgba(255,255,255,0.05)] p-1.5 rounded-lg"
                                  >
                                    <img
                                      src={`https://openweathermap.org/img/wn/${w.icon}@2x.png`}
                                      alt={w.description}
                                      className="w-6 h-6"
                                    />
                                    <span>{Math.round(w.temp)}°C</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <p>No forecast available</p>
                          )}

                          {/* Bookings */}
                          {trip.bookings?.length > 0 && (
                            <div>
                              <h4 className="text-white font-medium mb-1">Bookings</h4>
                              {trip.bookings.map((booking) => (
                                <div
                                  key={booking._id}
                                  className="flex justify-between items-center bg-[rgba(255,255,255,0.03)] p-2 rounded-lg border border-[rgba(255,255,255,0.06)]"
                                >
                                  <span>{booking.user?.email || "User"}</span>
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-[10px] ${booking.status === "accepted"
                                        ? "bg-green-600/80 text-white"
                                        : booking.status === "pending"
                                          ? "bg-amber-600/80 text-white"
                                          : "bg-red-600/80 text-white"
                                        }`}
                                    >
                                      {booking.status}
                                    </span>

                                    {/* Accept/Reject Buttons */}
                                    {String(trip.createdBy?._id || trip.createdBy) === String(currentUser?._id) &&

                                      booking.status === "pending" &&
                                      trip.status === "upcoming" && (
                                        <>
                                          <button
                                            onClick={() =>
                                              acceptBooking(trip._id, booking._id)
                                            }
                                            className="text-green-400 hover:text-green-300 text-xs"
                                            title="Accept"
                                          >
                                            <i className="fas fa-check"></i>
                                          </button>
                                          <button
                                            onClick={() =>
                                              rejectBooking(trip._id, booking._id)
                                            }
                                            className="text-red-400 hover:text-red-300 text-xs"
                                            title="Reject"
                                          >
                                            <i className="fas fa-times"></i>
                                          </button>
                                        </>
                                      )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}



          {/* ===================== MY BOOKINGS ===================== */}
          {currentTab === 'bookings' && (
            <>
              <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white m-0 [text-shadow:2px_2px_8px_rgba(0,0,0,0.7)]">
                    My Bookings
                  </h2>
                  <p className="text-[#a9b1c3] text-sm sm:text-base mt-1">
                    Trips you've booked
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={activeFilter.bookings}
                    onChange={(e) =>
                      setActiveFilter((prev) => ({ ...prev, bookings: e.target.value }))
                    }
                    className="px-3 py-2 bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.12)] rounded-xl text-white text-sm focus:outline-none focus:border-violet-500"
                  >
                    <option value="all" className="bg-[#0f1220] text-white">
                      All
                    </option>
                    <option value="upcoming" className="bg-[#0f1220] text-white">
                      Upcoming
                    </option>
                    <option value="past" className="bg-[#0f1220] text-white">
                      Past
                    </option>
                    <option value="cancelled" className="bg-[#0f1220] text-white">
                      Cancelled
                    </option>
                  </select>
                </div>
              </div>

              {getFilteredBookings().length === 0 ? (
                <div className="text-center py-12 sm:py-16 bg-[rgba(255,255,255,0.04)] rounded-[22px] border border-[rgba(255,255,255,0.08)]">
                  <i className="fas fa-calendar-check text-5xl sm:text-6xl text-[#a9b1c3]/30 mb-4"></i>
                  <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
                    No bookings yet
                  </h3>
                  <p className="text-[#a9b1c3] mb-6">
                    Join some trips to see your bookings here!
                  </p>

                  <button
                    onClick={() => setCurrentTab('discover')}
                    className="px-6 py-3 bg-gradient-to-br from-violet-600 to-cyan-500 text-white rounded-xl font-semibold hover:scale-105 transition-all shadow-[0_10px_24px_rgba(124,58,237,0.35)]"
                  >
                    Discover Trips
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {getFilteredBookings().map((booking) => {
                    const bookingCancelable = canCancelBooking(booking);

                    return (
                      <div
                        key={booking._id}
                        className="bg-[rgba(255,255,255,0.06)] backdrop-blur-xl border border-[rgba(255,255,255,0.1)] rounded-[22px] overflow-hidden hover:shadow-[0_18px_60px_rgba(124,58,237,0.15)] transition-all flex flex-col min-h-[480px] sm:min-h-[500px]"
                      >
                        {/* 🖼️ Trip Image (smaller size, flush top) */}
                        {booking.image && (
                          <img
                            src={booking.image}
                            alt={booking.title}
                            className="w-full h-40 sm:h-34 object-cover rounded-t-[22px]"
                          />
                        )}

                        <div className="p-5 flex flex-col justify-between flex-1">
                          {/* 🧭 Header */}
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="text-lg sm:text-xl font-bold text-white mb-1">
                                {booking.title}
                              </h3>
                              <p className="text-[#a9b1c3] text-sm">
                                {booking.from} → {booking.to}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="text-white font-bold">
                                ₹
                                {(booking.pricePerPerson || 0) *
                                  (booking.mySeatsBooked || 1)}
                              </span>
                              <p className="text-xs text-[#a9b1c3]">Total for you</p>
                            </div>
                          </div>
                          {/* 🎯 Status + Seats */}
                          <div className="flex items-center gap-1 mb-1">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-semibold ${getBookingStatus(booking) === 'upcoming'
                                ? 'bg-green-600/90'
                                : getBookingStatus(booking) === 'completed'
                                  ? 'bg-blue-600/90'
                                  : getBookingStatus(booking) === 'cancelled'
                                    ? 'bg-gray-600/90'
                                    : getBookingStatus(booking) === 'rejected'
                                      ? 'bg-red-600/90'
                                      : 'bg-gray-600/60'
                                } text-white`}
                            >
                              {getBookingStatus(booking)}
                            </span>


                            {booking.mySeatsBooked > 0 && (
                              <span className="px-3 py-1 bg-violet-600/90 text-white rounded-full text-xs font-semibold">
                                {booking.mySeatsBooked} seats
                              </span>
                            )}
                          </div>

                          {/* 📅 Trip Info */}
                          <div className="text-sm text-[#a9b1c3] space-y-1 mb-3">
                            <div className="flex items-center gap-2">
                              <i className="fas fa-calendar text-cyan-400 w-4"></i>
                              {new Date(booking.startDate).toLocaleDateString()} -{' '}
                              {new Date(booking.endDate).toLocaleDateString()}
                            </div>
                            {booking.daysLeft > 0 && (
                              <div className="flex items-center gap-2 text-[#a9b1c3]">
                                <i className="fas fa-clock text-cyan-400"></i>
                                <span>{booking.daysLeft} days left</span>
                              </div>
                            )}

                          </div>

                          {/* 🌤️ Weather Section */}

                          {/* 🚀 Actions */}
                          <div className="flex items-center justify-between mt-3">
                            <button
                              onClick={() => cancelBooking(booking.tripId)}
                              disabled={!canCancelBooking(booking)}
                              className={`px-3 py-2 rounded-xl text-sm font-semibold flex items-center gap-1 transition-all ${canCancelBooking(booking)
                                  ? 'bg-red-600/90 hover:bg-red-700 text-white'
                                  : 'bg-gray-600/60 cursor-not-allowed text-white'
                                }`}
                            >
                              <i className="fas fa-times"></i> Cancel Booking
                            </button>


                          </div>

                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}


          {/* ===================== DISCOVER ===================== */}
          {currentTab === 'discover' && (
            <div>
              <ChatWidget />
              <div className="mb-6">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">
                  Discover Trips
                </h2>
                <p className="text-[#a9b1c3] text-sm sm:text-base mt-1">
                  Explore available trips — join or view details
                </p>
              </div>

              {/* 🔍 Search */}
              <div className="mb-4">
                <form onSubmit={handleSearchSubmit} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Search city or place..."
                    value={searchQuery}
                    onChange={handleSearchInput}
                    className="flex-1 px-4 py-3 bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.12)] rounded-xl text-white placeholder-[#a9b1c3] focus:outline-none focus:border-violet-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-3 bg-gradient-to-br from-violet-600 to-cyan-500 rounded-xl font-semibold hover:scale-105 transition-all"
                  >
                    Search
                  </button>
                </form>
              </div>

              {/* 🧳 Discover Cards */}
              {availableTrips.length === 0 ? (
                <div className="text-center py-12 bg-[rgba(255,255,255,0.04)] rounded-[22px] border border-[rgba(255,255,255,0.08)]">
                  <p className="text-[#a9b1c3]">
                    No trips available to discover right now. Check later or create one!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {availableTrips.map((trip) => {
                    const alreadyBooked =
                      myBookings.some((b) => String(b.tripId || b._id) === String(trip._id)) ||
                      (trip.bookings || []).some(
                        (b) => b.user && String(b.user._id) === String(currentUser?._id)
                      );

                    const isFlipped = flipped.has(trip._id);

                    return (
                      <div
                        key={trip._id}
                        className="relative h-[520px]"
                        style={{ perspective: "1200px" }}
                      >
                        <div
                          className="relative w-full h-full transition-transform duration-700 ease-in-out"
                          style={{
                            transformStyle: "preserve-3d",
                            transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                          }}
                        >
                          {/* FRONT SIDE */}
                          <div
                            className="absolute inset-0 w-full h-full bg-[rgba(255,255,255,0.06)] backdrop-blur-xl border border-[rgba(255,255,255,0.1)] rounded-2xl overflow-hidden flex flex-col hover:shadow-[0_18px_60px_rgba(124,58,237,0.12)] transition-all"
                            style={{ backfaceVisibility: "hidden" }}
                          >
                            {/*  Image flush with card */}
                            <div className="w-full h-30 sm:h-26">
                              {trip.image ? (
                                <img
                                  src={trip.image}
                                  alt={trip.title}
                                  className="w-full h-full object-cover rounded-t-2xl"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-[rgba(255,255,255,0.03)] text-[#a9b1c3] rounded-t-2xl">
                                  <i className="fas fa-image text-3xl"></i>
                                </div>
                              )}
                            </div>

                            {/* Content */}
                            <div className="flex flex-col justify-between flex-1 p-2">
                              {/* Header */}
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex-1 min-w-0">
                                  <h3 className="text-lg font-bold text-white truncate">
                                    {trip.title}
                                  </h3>
                                  <p className="text-[#a9b1c3] text-sm mt-1">
                                    {trip.from} → {trip.to}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <span className="text-white font-bold">
                                    ₹{trip.pricePerPerson}/person
                                  </span>
                                  <div className="text-[#a9b1c3] text-xs">
                                    {trip.availableSeats} seats left
                                  </div>
                                  <span
                                    className={`inline-block mt-1 px-2 py-1 rounded-full text-xs font-semibold ${trip.status === "upcoming"
                                      ? "bg-green-600/90"
                                      : trip.status === "ongoing"
                                        ? "bg-amber-600/90"
                                        : "bg-blue-600/90"
                                      } text-white`}
                                  >
                                    {trip.status}
                                  </span>
                                </div>
                              </div>

                              {/* Details */}
                              <div className="text-sm text-[#a9b1c3] space-y-1 mb-2">
                                <div className="flex items-center gap-2">
                                  <i className="fas fa-calendar text-cyan-400 w-4"></i>
                                  {new Date(trip.startDate).toLocaleDateString()} -{" "}
                                  {new Date(trip.endDate).toLocaleDateString()}
                                </div>
                                <div className="flex items-center gap-2">
                                  <i
                                    className={`fas ${getTransportIcon(
                                      trip.modeOfTransport
                                    )} text-cyan-400 w-4`}
                                  />
                                  {trip.modeOfTransport || "Car"}
                                </div>
                                <div className="flex items-center gap-2">
                                  <i className="fas fa-users text-cyan-400 w-4"></i>
                                  Booked:{" "}
                                  {Array.isArray(trip.bookings) ? trip.bookings.length : 0}
                                </div>
                                <div className="flex items-center gap-2">
                                  <i className="fas fa-phone text-cyan-400 w-4"></i>
                                  {trip.phoneNo || "N/A"}
                                </div>
                              </div>

                              {/* Weather Scroll */}
                              {trip.weather && trip.weather.length > 0 && (
                                <div className="mt-3">
                                  <h4 className="text-sm font-semibold text-white mb-2">
                                    Weather Forecast
                                  </h4>
                                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-[rgba(255,255,255,0.25)] scrollbar-track-transparent">
                                    {trip.weather.map((w, idx) => (
                                      <div
                                        key={idx}
                                        className="flex flex-col items-center bg-[rgba(255,255,255,0.05)] p-2 rounded-md min-w-[80px]"
                                      >
                                        <img
                                          src={`https://openweathermap.org/img/wn/${w.icon}@2x.png`}
                                          alt={w.description}
                                          className="w-8 h-8"
                                        />
                                        <div className="text-xs text-white mt-1">
                                          {Math.round(w.temp)}°C
                                        </div>
                                        <div className="text-[10px] text-[#a9b1c3] capitalize">
                                          {w.description}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Actions */}
                              <div className="flex items-center justify-between mt-4 gap-4">
                                <button
                                  disabled={
                                    alreadyBooked ||
                                    trip.availableSeats <= 0 ||
                                    trip.status !== "upcoming"
                                  }
                                  onClick={() => {
                                    setSelectedTripId(trip._id);
                                    setShowJoinModal(true);
                                  }}
                                  className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all ${alreadyBooked ||
                                    trip.availableSeats <= 0 ||
                                    trip.status !== "upcoming"
                                    ? "bg-gray-600/60 cursor-not-allowed text-white"
                                    : "bg-gradient-to-br from-violet-600 to-cyan-500 text-white hover:scale-105 shadow-[0_6px_16px_rgba(124,58,237,0.45)]"
                                    }`}
                                >
                                  {alreadyBooked
                                    ? "Already Joined"
                                    : trip.availableSeats <= 0
                                      ? "Full"
                                      : "Join"}
                                </button>

                                <button
                                  onClick={() => toggleFlip(trip._id)}
                                  className="px-4 py-2 bg-[rgba(255,255,255,0.04)] text-sm rounded-xl border border-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.08)] transition-all"
                                >
                                  View
                                </button>

                                <span className="text-xs text-[#a9b1c3] ml-auto">
                                  Owner:{" "}
                                  <span className="text-white">
                                    {trip.createdBy?.email || trip.ownerEmail || "Host"}
                                  </span>
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* BACK SIDE */}
                          <div
                            className="absolute inset-0 w-full h-full bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] rounded-2xl p-4 flex flex-col items-center justify-center"
                            style={{
                              transform: "rotateY(180deg)",
                              backfaceVisibility: "hidden",
                            }}
                          >
                            {trip.image ? (
                              <img
                                src={trip.image}
                                alt={trip.title}
                                className="w-full h-64 object-cover rounded-[16px] shadow-[0_8px_30px_rgba(0,0,0,0.5)] mb-4"
                              />
                            ) : (
                              <div className="w-full h-64 flex items-center justify-center bg-[rgba(255,255,255,0.05)] rounded-[16px] mb-4">
                                <i className="fas fa-image text-3xl text-[#a9b1c3]"></i>
                              </div>
                            )}

                            <h3 className="text-lg font-bold text-white">{trip.title}</h3>
                            <p className="text-xs text-[#a9b1c3] mt-1">
                              Hosted by{" "}
                              <span className="text-white">
                                {trip.createdBy?.email || trip.ownerEmail || "Host"}
                              </span>
                            </p>

                            <button
                              onClick={() => toggleFlip(trip._id)}
                              className="mt-4 px-4 py-2 bg-[rgba(0,0,0,0.5)] text-white rounded-lg border border-[rgba(255,255,255,0.1)] hover:bg-[rgba(0,0,0,0.6)] transition-all"
                            >
                              Close
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ===================== CREATE ===================== */}
          {currentTab === 'create' && (
            <div className="bg-[rgba(255,255,255,0.06)] backdrop-blur-xl rounded-[22px] border border-[rgba(255,255,255,0.1)] p-6 sm:p-8 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">Create Trip</h2>
              <form onSubmit={handleTripCreation} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block font-semibold text-white text-sm sm:text-base">Title</label>
                    <input name="title" required className="w-full px-4 py-3 bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.12)] rounded-xl text-white placeholder-[#a9b1c3] focus:outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="block font-semibold text-white text-sm sm:text-base">From</label>
                    <input name="from" required className="w-full px-4 py-3 bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.12)] rounded-xl text-white" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block font-semibold text-white text-sm sm:text-base">To</label>
                    <input name="to" required className="w-full px-4 py-3 bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.12)] rounded-xl text-white" />
                  </div>
                  <div className="space-y-2">
                    <label className="block font-semibold text-white text-sm sm:text-base">Image (URL)</label>
                    <input name="image" className="w-full px-4 py-3 bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.12)] rounded-xl text-white" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block font-semibold text-white text-sm sm:text-base">Start Date</label>
                    <input
                      type="datetime-local"
                      name="startDate"
                      required
                      min={new Date().toISOString().slice(0, 16)}
                      className="w-full px-4 py-3 bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.12)] rounded-xl text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block font-semibold text-white text-sm sm:text-base">End Date</label>
                    <input
                      type="datetime-local"
                      name="endDate"
                      required
                      min={new Date().toISOString().slice(0, 16)}
                      className="w-full px-4 py-3 bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.12)] rounded-xl text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-white text-sm sm:text-base">Available Seats</label>
                    <input name="seats" type="number" min="1" required className="w-full px-4 py-3 bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.12)] rounded-xl text-white" />
                  </div>
                  <div>
                    <label className="block font-semibold text-white text-sm sm:text-base">Price per Person</label>
                    <input name="pricePerPerson" type="number" min="0" step="0.01" required className="w-full px-4 py-3 bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.12)] rounded-xl text-white" />
                  </div>
                </div>
                {/* Mode of Transport */}
                <div>
                  <label className="block font-semibold text-white text-sm sm:text-base">Mode of transport</label>
                  <select
                    name="modeOfTransport"
                    defaultValue=""
                    className="w-full px-4 py-3 bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.12)] rounded-xl text-grey bg-grey-599"
                  >
                    <option className='bg-black' value="">Select (optional)</option>
                    <option className='bg-black' value="bus">Bus</option>
                    <option className='bg-black' value="airplane">Airplane</option>
                    <option className='bg-black' value="car">Car</option>
                    <option className='bg-black' value="railway">Railway</option>
                    
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-white text-sm sm:text-base">Phone Number</label>
                  <input name="phoneNo" type="tel" required className="w-full px-4 py-3 bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.12)] rounded-xl text-white" />
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button type="submit" className="px-6 py-3 bg-gradient-to-br from-violet-600 to-cyan-500 text-white rounded-xl font-semibold hover:scale-105 transition-all">
                    Create Trip
                  </button>
                </div>
              </form>
            </div>
          )}  
        </div>
      </main>

      {/* Join modal */}
      {showJoinModal && selectedTripId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10000] p-4" onClick={() => setShowJoinModal(false)}>
          <div className="bg-[rgba(255,255,255,0.06)] backdrop-blur-xl border border-[rgba(255,255,255,0.1)] rounded-[22px] p-4 sm:p-6 md:p-8 max-w-md w-full sm:w-[90%] shadow-[0_10px_30px_rgba(0,0,0,0.35)]" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4 sm:mb-6 pb-4 border-b border-[rgba(255,255,255,0.1)]">
              <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-white m-0">Join Trip</h3>
              <button onClick={() => setShowJoinModal(false)} className="text-xl sm:text-2xl text-[#a9b1c3] hover:text-white border-none bg-transparent cursor-pointer">&times;</button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const seats = e.target.seatsBooked.value;
                handleJoinTrip(seats);
              }}
            >
              <div className="space-y-2 mb-4 sm:mb-6">
                <label className="block font-semibold text-white text-sm sm:text-base">Number of Seats</label>
                <input type="number" name="seatsBooked" min="1" defaultValue="1" required className="w-full px-4 py-3 bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.12)] rounded-xl text-white placeholder-[#a9b1c3]" />
              </div>

              <button type="submit" className="w-full px-4 py-3 sm:py-4 bg-gradient-to-br from-violet-600 to-cyan-500 text-white rounded-xl text-sm sm:text-base font-semibold transition-all hover:scale-105 shadow-[0_10px_24px_rgba(124,58,237,0.35)]">
                Proceed to Pay
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Search results modal */}
      {showSearchModal && searchResults && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[10000] overflow-y-auto p-4" onClick={() => { setShowSearchModal(false); setSearchResults(null); setSearchQuery(''); }}>
          <div className="bg-[rgba(255,255,255,0.06)] backdrop-blur-xl border border-[rgba(255,255,255,0.1)] rounded-[22px] p-4 sm:p-6 md:p-8 max-w-4xl w-full sm:w-[90%] max-h-[90vh] overflow-y-auto my-4 sm:my-8 shadow-[0_10px_30px_rgba(0,0,0,0.35)]" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4 sm:mb-6 pb-4 border-b border-[rgba(255,255,255,0.1)] sticky top-0 bg-[rgba(15,18,32,0.95)] z-10">
              <h3 className="text-lg sm:text-xl font-bold text-white m-0">Search results — {searchResults.city}</h3>
              <button onClick={() => { setShowSearchModal(false); setSearchResults(null); setSearchQuery(''); }} className="text-xl sm:text-2xl text-[#a9b1c3] hover:text-white">&times;</button>
            </div>

            <div className="space-y-3">
              {searchResults.places.map((place, idx) => (
                <div key={idx} className="flex gap-3 items-center bg-[rgba(255,255,255,0.03)] p-3 rounded-lg border border-[rgba(255,255,255,0.06)]">
                  {place.image ? (
                    <img src={place.image} alt={place.name} className="w-20 h-14 object-cover rounded-md flex-shrink-0" />
                  ) : (
                    <div className="w-20 h-14 rounded-md bg-[rgba(255,255,255,0.02)] flex items-center justify-center text-[#a9b1c3]">
                      <i className="fas fa-image"></i>
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-semibold text-white">{place.name}</h4>
                        <p className="text-xs text-[#a9b1c3]">{place.address}</p>
                      </div>
                      {place.rating && (
                        <div className="flex items-center gap-1 text-amber-500 font-semibold text-xs">
                          <i className="fas fa-star"></i>
                          <span>{place.rating.toFixed(1)}</span>
                          <span className="text-[#a9b1c3] text-xs ml-1">/ 5</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Inline styles & small animations */}
      <style>{`
        @keyframes bounceIn {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.05); }
          70% { transform: scale(0.9); }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-bounceIn { animation: bounceIn 0.6s ease-out; }

        /* 3D flip container */
        .discover-card-3d { perspective: 1200px; }
        .discover-card-inner { transition: transform 0.6s; transform-style: preserve-3d; position: relative; }
        .discover-card-inner.flipped { transform: rotateY(180deg); }
        .discover-card-front, .discover-card-back {
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }
        .discover-card-back { transform: rotateY(180deg); position: absolute; top: 0; left: 0; width: 100%; height: 100%; }

        /* Weather scroll niceties */
        .weather-scroll { -webkit-overflow-scrolling: touch; scrollbar-width: thin; }
        .weather-scroll::-webkit-scrollbar { height: 8px; }
        .weather-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.06); border-radius: 8px; }

        /* responsive adjustments */
        @media (min-width: 640px) {
          .discover-card-back, .discover-card-front { min-height: 160px; }
        }
        @media (max-width: 639px) {
          /* stack image on top naturally handled by flex-col on small screens */
        }

        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

        select { appearance: none; -webkit-appearance: none; -moz-appearance: none; padding-right: 2.5rem;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23a9b1c3'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: right 1rem center; background-size: 1.2rem; }
      `}</style>
    </div>
  );
};

export default Dashboard;
