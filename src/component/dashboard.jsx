import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import '@fortawesome/fontawesome-free/css/all.min.css';

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // 🆕 For mobile sidebar toggle


  const API_BASE = 'https://trip-planner-backend-y5v9.onrender.com';


  const validateToken = useCallback(
    (response) => {
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
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 5000);
  }, []);

  // Fetch with auth
  const fetchWithAuth = useCallback(
    async (url, options = {}) => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return null;
      }
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${token}`,
        },
      });
      if (!validateToken(response)) return null;
      return response;
    },
    [navigate, validateToken]
  );

  // Load user data
  const loadUserData = useCallback(async () => {
    try {
      const response = await fetchWithAuth(`${API_BASE}/user/dashboard-data`);
      if (!response) return;
      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data);
        localStorage.setItem('userEmail', data.email);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      if (!localStorage.getItem('token')) {
        navigate('/login');
      }
    }
  }, [fetchWithAuth, navigate]);

  // Load dashboard data
  const loadDashboardData = useCallback(async () => {
    try {
      const [tripsResponse, bookingsResponse] = await Promise.all([
        fetchWithAuth(`${API_BASE}/trips/my-trips`),
        fetchWithAuth(`${API_BASE}/trips/my-booking`),
      ]);
      if (!tripsResponse || !bookingsResponse) return;
      if (tripsResponse.ok) {
        const tripsData = await tripsResponse.json();
        setMyTrips(tripsData.trips || []);
      }
      if (bookingsResponse.ok) {
        const bookingsData = await bookingsResponse.json();
        setMyBookings(bookingsData.bookings || []);
      }
      updateDashboardStats();
      await loadAvailableTrips();
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      if (!localStorage.getItem('token')) {
        navigate('/login');
      }
    }
  }, [fetchWithAuth, navigate]);

  // Update dashboard statistics
  const updateDashboardStats = useCallback(() => {
    const totalTrips = myTrips.length;
    const upcomingTrips = myTrips.filter((trip) => trip.status === 'upcoming').length;
    const totalBookings = myBookings.length;
    const pendingBookings = myBookings.filter(
      (booking) =>
        booking.status === 'pending' ||
        (booking.bookings && booking.bookings.some((b) => b.status === 'pending'))
    ).length;
    setDashboardStats({ totalTrips, totalBookings, upcomingTrips, pendingBookings });
  }, [myTrips, myBookings]);

  // Load available trips
  const loadAvailableTrips = useCallback(async () => {
    try {
      const response = await fetchWithAuth(`${API_BASE}/trips/all`);
      if (!response) return;
      if (response.ok) {
        const data = await response.json();
        setAvailableTrips(data.trips || []);
      }
    } catch (error) {
      console.error('Error loading available trips:', error);
    }
  }, [fetchWithAuth]);

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userEmail');
    showNotification('Successfully logged out!', 'success');
    setTimeout(() => navigate('/login'), 1000);
  };

  // Handle trip creation
  const handleTripCreation = async (e) => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const tripData = Object.fromEntries(formData.entries());
    // Validation
    if (!tripData.title || tripData.title.trim().length < 3) {
      showNotification('Please enter a trip title (at least 3 characters)', 'warning');
      return;
    }
    const startDate = new Date(tripData.startDate);
    const endDate = new Date(tripData.endDate);
    const now = new Date();
    if (startDate < now) {
      showNotification('Start date cannot be in the past!', 'error');
      return;
    }
    if (endDate <= startDate) {
      showNotification('End date must be after start date!', 'error');
      return;
    }
    tripData.startDate = startDate.toISOString();
    tripData.endDate = endDate.toISOString();
    tripData.seats = parseInt(tripData.seats, 10);
    tripData.pricePerPerson = parseFloat(tripData.pricePerPerson);
    try {
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
      console.error('Error creating trip:', error);
      showNotification('Failed to create trip. Please try again.', 'error');
    }
  };

 
  const handleJoinTrip = async (seatsBooked) => {
    try {
      const response = await fetchWithAuth(`${API_BASE}/trips/${selectedTripId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seatsBooked: parseInt(seatsBooked) }),
      });
      if (!response) return;
      if (response.ok) {
        showNotification('Successfully joined trip!', 'success');
        setShowJoinModal(false);
        await loadDashboardData();
        await loadAvailableTrips();
        setCurrentTab('bookings');
      } else {
        const error = await response.json();
        showNotification(error.message || 'Failed to join trip', 'error');
      }
    } catch (error) {
      console.error('Error joining trip:', error);
      showNotification('Failed to join trip', 'error');
    }
  };


  const cancelTrip = async (tripId) => {
    if (!window.confirm('Are you sure you want to cancel this trip?')) return;
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
        showNotification(error.message || 'Failed to cancel trip', error);
      }
    } catch (error) {
      showNotification('Failed to cancel trip', error);
    }
  };


  const cancelBooking = async (tripId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    try {
      const response = await fetchWithAuth(`${API_BASE}/trips/${tripId}/cancel-booking`, {
        method: 'POST',
      });
      if (!response) return;
      if (response.ok) {
        showNotification('Booking cancelled successfully', 'success');
        await loadDashboardData();
      } else {
        const error = await response.json();
        showNotification(error.message || 'Failed to cancel booking', error);
      }
    } catch (error) {
      showNotification('Failed to cancel booking', error);
    }
  };

 
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
        showNotification(error.message || 'Failed to accept booking', error);
      }
    } catch (error) {
      showNotification('Failed to accept booking', error);
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
        showNotification(error.message || 'Failed to reject booking', error);
      }
    } catch (error) {
      showNotification('Failed to reject booking', error);
    }
  };

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
        console.log('Search API response:', data);
        let places = data.places || data.results || [];
        if (!Array.isArray(places)) {
          console.error('Invalid places data:', places);
          showNotification('No valid places found', 'info');
          setSearchResults(null);
          setShowSearchModal(false);
          return;
        }
        places = places
          .slice(0, 10)
          .map((place) => ({
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
    [fetchWithAuth, showNotification]
  );

  // Handle search input with debouncing
  const handleSearchInput = useCallback(
    (e) => {
      const query = e.target.value;
      setSearchQuery(query);
      clearTimeout(window.searchTimeout);
      window.searchTimeout = setTimeout(() => {
        performSearch(query.trim());
      }, 2000);
    },
    [performSearch]
  );

  // Handle search submit
  const handleSearchSubmit = useCallback(
    (e) => {
      e.preventDefault();
      performSearch(searchQuery.trim());
    },
    [searchQuery, performSearch]
  );


  const getFilteredTrips = () => {
    if (activeFilter.trips === 'all') {
      return myTrips.filter((trip) => trip.status !== 'cancelled');
    }
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

  // Get transport icon
  const getTransportIcon = (mode) => {
    const icons = { bus: 'fa-bus', railway: 'fa-train', airplane: 'fa-plane', car: 'fa-car' };
    return icons[mode] || 'fa-car';
  };

  // Get booking status
  const getBookingStatus = (booking) => {
    if (booking.isCancelled) return 'cancelled';
    if (booking.isPast) return 'completed';
    if (booking.isUpcoming) return 'upcoming';
    return 'unknown';
  };

  // Initialize dashboard
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    loadUserData();
    loadDashboardData();
    const refreshInterval = setInterval(loadDashboardData, 5 * 60 * 1000);
    const tokenCheckInterval = setInterval(async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await fetchWithAuth(`${API_BASE}/user/dashboard-data`);
          if (!response) return;
          validateToken(response);
        } catch (error) {
          console.error('Token validation check failed:', error);
        }
      }
    }, 2 * 60 * 1000);
    return () => {
      clearInterval(refreshInterval);
      clearInterval(tokenCheckInterval);
    };
  }, [fetchWithAuth, loadDashboardData, loadUserData, navigate, validateToken]);

  // Update stats when trips/bookings change
  useEffect(() => {
    updateDashboardStats();
  }, [myTrips, myBookings, updateDashboardStats]);

  // Get user display name
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


  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600">
      {/* Notifications */}
      <div className="fixed top-5 right-5 z-[10000] flex flex-col gap-2 max-w-[90%] sm:max-w-[420px]">
        {notifications.map((notif) => (
          <div
            key={notif.id}
            className={`flex items-center gap-3 px-4 py-3 sm:px-6 sm:py-4 rounded-xl shadow-2xl backdrop-blur-sm border border-white/10 text-white animate-slideIn ${
              notif.type === 'success'
                ? 'bg-green-500'
                : notif.type === 'warning'
                ? 'bg-amber-500'
                : notif.type === 'error'
                ? 'bg-red-500'
                : 'bg-blue-500'
            }`}
          >
            <i
              className={`fas fa-${
                notif.type === 'success'
                  ? 'check-circle'
                  : notif.type === 'warning'
                  ? 'exclamation-triangle'
                  : notif.type === 'error'
                  ? 'times-circle'
                  : 'info-circle'
              }`}
            ></i>
            <span className="text-sm sm:text-base">{notif.message}</span>
            <button
              onClick={() => setNotifications((prev) => prev.filter((n) => n.id !== notif.id))}
              className="ml-2 text-lg sm:text-xl hover:opacity-80"
            >
              &times;
            </button>
          </div>
        ))}
      </div>

     
      <nav
        className={`fixed top-0 left-0 h-screen w-64 sm:w-72 bg-white/95 backdrop-blur-xl border-r border-white/20 z-[1000] shadow-2xl flex flex-col transition-transform duration-300 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full sm:translate-x-0'
        }`}
      >
        <div className="p-4 sm:p-6 border-b border-black/10 flex items-center justify-between">
          <div
            className="flex items-center gap-2 sm:gap-3 font-bold text-xl sm:text-2xl text-indigo-600 cursor-pointer"
            onClick={() => navigate('/')}
          >
            <i className="fas fa-map-marked-alt text-2xl sm:text-3xl bg-gradient-to-br from-indigo-600 to-purple-600 bg-clip-text text-transparent"></i>
            <span>Ghumakkad</span>
          </div>
          <button
            className="sm:hidden text-2xl text-gray-600 hover:text-gray-800"
            onClick={toggleSidebar}
            aria-label="Close sidebar"
          >
            &times;
          </button>
        </div>
        <ul className="py-4 sm:py-8 flex-1">
          {[
            { id: 'overview', icon: 'fa-home', label: 'Overview' },
            { id: 'trips', icon: 'fa-route', label: 'My Trips' },
            { id: 'bookings', icon: 'fa-ticket-alt', label: 'My Bookings' },
            { id: 'discover', icon: 'fa-compass', label: 'Discover' },
            { id: 'create', icon: 'fa-plus-circle', label: 'Create Trip' },
          ].map((item) => (
            <li key={item.id} className="my-1 sm:my-2">
              <button
                onClick={() => {
                  setCurrentTab(item.id);
                  setIsSidebarOpen(false); // Close sidebar on selection
                }}
                className={`flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-3 sm:py-4 w-full text-left transition-all duration-300 rounded-r-[50px] mr-2 sm:mr-4 text-sm sm:text-base ${
                  currentTab === item.id
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-400/40 translate-x-1 sm:translate-x-2.5'
                    : 'text-gray-600 hover:bg-gradient-to-r hover:from-indigo-600 hover:to-purple-600 hover:text-white hover:translate-x-1 sm:hover:translate-x-2.5'
                }`}
              >
                <i className={`fas ${item.icon} text-lg sm:text-xl w-5 text-center`}></i>
                <span>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="p-4 sm:p-6 border-t border-black/10">
          <button
            onClick={handleLogout}
            className="w-full px-4 py-3 sm:py-4 bg-gradient-to-r from-red-500 to-orange-600 text-white rounded-xl font-semibold text-sm sm:text-base transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-red-500/40 flex items-center justify-center gap-2"
          >
            <i className="fas fa-sign-out-alt"></i>
            <span>Logout</span>
          </button>
        </div>
      </nav>

 
      <main className={`flex-1 bg-gray-50 min-h-screen transition-all duration-300 ${isSidebarOpen ? 'ml-0' : 'ml-0 sm:ml-72'}`}>
        {/* Hamburger Menu for Mobile */}
        <button
          className="sm:hidden fixed top-4 left-4 z-[1001] p-2 bg-indigo-600 text-white rounded-lg"
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
        >
          <i className="fas fa-bars text-lg"></i>
        </button>

   \
        <header className="bg-white/95 backdrop-blur-xl px-4 sm:px-6 md:px-8 py-4 sm:py-6 flex flex-col sm:flex-row justify-between items-center border-b border-black/10 sticky top-0 z-[100]">
          <form onSubmit={handleSearchSubmit} className="flex-1 w-full sm:max-w-[600px] relative mb-4 sm:mb-0">
            <div className="relative flex items-center bg-white rounded-[25px] shadow-lg overflow-hidden transition-all duration-300 focus-within:shadow-xl focus-within:shadow-indigo-600/30 focus-within:-translate-y-0.5">
              <i className="fas fa-search absolute left-3 sm:left-4 text-gray-400 z-10 text-sm sm:text-base"></i>
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchInput}
                placeholder="Search destinations, trips..."
                className="flex-1 px-3 pl-10 sm:pl-12 py-3 sm:py-4 border-none outline-none text-sm sm:text-base bg-transparent"
              />
              <button
                type="submit"
                disabled={isSearching}
                className="px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm sm:text-base transition-all duration-300 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50"
              >
                {isSearching ? (
                  <i className="fas fa-spinner fa-spin"></i>
                ) : (
                  <i className="fas fa-arrow-right"></i>
                )}
              </button>
            </div>
          </form>
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="relative cursor-pointer p-2 rounded-full transition-all duration-300 hover:bg-indigo-600/10">
              <i className="fas fa-bell text-lg sm:text-xl text-gray-600"></i>
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-2 py-0.5 rounded-[10px] min-w-[20px] text-center">
                3
              </span>
            </div>
            <div className="flex items-center gap-3 sm:gap-4 cursor-pointer px-3 sm:px-4 py-2 rounded-[25px] transition-all duration-300 hover:bg-indigo-600/10">
              <img
                src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&q=80"
                alt="Profile"
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border-2 sm:border-3 border-indigo-600"
              />
              <span className="font-semibold text-gray-800 text-sm sm:text-base">{getUserDisplayName()}</span>
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6 md:p-8">
          {/* Overview Tab */}
          {currentTab === 'overview' && (
            <>
              {/* Welcome Section */}
              <section className="mb-8 sm:mb-12">
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 sm:p-8 md:p-12 rounded-[20px] shadow-2xl shadow-indigo-600/30 relative overflow-hidden">
                  <div className="absolute -top-1/2 -right-1/2 w-[200%] h-[200%] bg-radial-gradient opacity-10 animate-float"></div>
                  <div className="relative z-10 mb-6 sm:mb-8">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">
                      {getGreeting()}, {getUserDisplayName()}!
                    </h1>
                    <p className="text-sm sm:text-base md:text-lg opacity-90 leading-relaxed">
                      Ready to plan your next adventure? Discover amazing destinations and connect with fellow travelers.
                    </p>
                  </div>
                  <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
                    {[
                      { label: 'Trips Created', value: dashboardStats.totalTrips },
                      { label: 'Trips Joined', value: dashboardStats.totalBookings },
                      { label: 'Upcoming Trips', value: dashboardStats.upcomingTrips },
                      { label: 'Pending Bookings', value: dashboardStats.pendingBookings },
                    ].map((stat, i) => (
                      <div key={i} className="text-center">
                        <div className="text-xl sm:text-2xl md:text-3xl font-bold mb-1 sm:mb-2">{stat.value}</div>
                        <div className="text-xs sm:text-sm opacity-80">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
              {/* Quick Actions */}
              <section className="mb-8 sm:mb-12">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 sm:mb-6 text-gray-800">Quick Actions</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                  {[
                    { icon: 'fa-plus', title: 'Create New Trip', desc: 'Plan your next adventure', tab: 'create' },
                    { icon: 'fa-compass', title: 'Discover Trips', desc: 'Find exciting adventures', tab: 'discover' },
                    { icon: 'fa-route', title: 'My Trips', desc: 'Manage your trips', tab: 'trips' },
                  ].map((action, i) => (
                    <div
                      key={i}
                      onClick={() => {
                        setCurrentTab(action.tab);
                        setIsSidebarOpen(false);
                      }}
                      className="bg-white p-4 sm:p-6 md:p-8 rounded-2xl text-center shadow-lg border border-black/5 transition-all duration-300 cursor-pointer hover:-translate-y-1 hover:shadow-2xl hover:shadow-indigo-600/20 hover:border-indigo-600"
                    >
                      <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 text-white text-lg sm:text-xl md:text-2xl">
                        <i className={`fas ${action.icon}`}></i>
                      </div>
                      <h3 className="text-lg sm:text-xl font-semibold mb-1 sm:mb-2 text-gray-800">{action.title}</h3>
                      <p className="text-gray-600 text-xs sm:text-sm">{action.desc}</p>
                    </div>
                  ))}
                </div>
              </section>
              {/* Popular Destinations */}
              <section>
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 sm:mb-6 text-gray-800">Popular Destinations</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
                  {[
                    {
                      img: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80',
                      tag: 'Mountains',
                      title: 'Swiss Alps',
                      desc: 'Breathtaking mountain views and adventure sports',
                      location: 'Switzerland',
                      travelers: 24,
                    },
                    {
                      img: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80',
                      tag: 'Beach',
                      title: 'Bali, Indonesia',
                      desc: 'Tropical paradise with rich culture',
                      location: 'Indonesia',
                      travelers: 18,
                    },
                    {
                      img: 'https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80',
                      tag: 'Island',
                      title: 'Santorini',
                      desc: 'Stunning sunsets and white architecture',
                      location: 'Greece',
                      travelers: 31,
                    },
                    {
                      img: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80',
                      tag: 'Historical',
                      title: 'Machu Picchu',
                      desc: 'Ancient Incan citadel in the mountains',
                      location: 'Peru',
                      travelers: 15,
                    },
                  ].map((dest, i) => (
                    <div
                      key={i}
                      className="bg-white rounded-2xl overflow-hidden shadow-lg transition-all duration-300 cursor-pointer hover:-translate-y-1 hover:shadow-2xl"
                    >
                      <div className="relative h-40 sm:h-48 md:h-[200px] overflow-hidden">
                        <img
                          src={dest.img}
                          alt={dest.title}
                          className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                        />
                        <div className="absolute top-2 sm:top-4 right-2 sm:right-4">
                          <span className="bg-indigo-600/90 text-white px-2 sm:px-4 py-1 sm:py-2 rounded-[20px] text-xs font-semibold backdrop-blur-sm">
                            {dest.tag}
                          </span>
                        </div>
                      </div>
                      <div className="p-4 sm:p-6">
                        <h3 className="text-lg sm:text-xl font-semibold mb-2 text-gray-800">{dest.title}</h3>
                        <p className="text-gray-600 text-sm mb-3 sm:mb-4 leading-relaxed">{dest.desc}</p>
                        <div className="flex justify-between text-xs sm:text-sm text-gray-400">
                          <span className="flex items-center gap-1 sm:gap-2">
                            <i className="fas fa-map-marker-alt"></i> {dest.location}
                          </span>
                          <span className="flex items-center gap-1 sm:gap-2">
                            <i className="fas fa-users"></i> {dest.travelers} travelers
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          {/* My Trips Tab */}
          {currentTab === 'trips' && (
            <>
              <div className="flex flex-col sm:flex-row justify-between items-center mb-6 sm:mb-8 pb-4 border-b border-gray-200">
                <h2 className="text-xl sm:text-2xl md:text-3xl text-gray-800 m-0">My Trips</h2>
                <div className="flex gap-2 mt-4 sm:mt-0 flex-wrap">
                  {['all', 'upcoming', 'ongoing', 'completed', 'cancelled'].map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setActiveFilter({ ...activeFilter, trips: filter })}
                      className={`px-3 sm:px-4 py-2 border rounded-[20px] text-xs sm:text-sm transition-all duration-300 ${
                        activeFilter.trips === filter
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-600 hover:text-indigo-600'
                      }`}
                    >
                      {filter.charAt(0).toUpperCase() + filter.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-4 sm:gap-6">
                {getFilteredTrips().length === 0 ? (
                  <div className="text-center py-8 sm:py-12 text-gray-600">
                    <i className="fas fa-route text-4xl sm:text-5xl text-gray-300 mb-4"></i>
                    <h3 className="text-lg sm:text-xl md:text-2xl mb-2 text-gray-800">No Trips Yet</h3>
                    <p className="mb-4 sm:mb-6 text-sm sm:text-base">
                      You haven't created any trips yet. Start by creating your first adventure!
                    </p>
                    <button
                      onClick={() => {
                        setCurrentTab('create');
                        setIsSidebarOpen(false);
                      }}
                      className="px-4 sm:px-6 py-2 sm:py-3 bg-indigo-600 text-white rounded-lg font-semibold text-sm sm:text-base hover:bg-indigo-700 transition-all"
                    >
                      Create Trip
                    </button>
                  </div>
                ) : (
                  getFilteredTrips().map((trip) => (
                    <div
                      key={trip._id}
                      className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl"
                    >
                      {trip.image && trip.image.trim() && (
                        <div className="h-48 sm:h-60 overflow-hidden">
                          <img
                            src={trip.image}
                            alt={trip.title}
                            onError={(e) => (e.target.style.display = 'none')}
                            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                            loading="lazy"
                          />
                        </div>
                      )}
                      <div className="p-4 sm:p-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start mb-4">
                          <div>
                            <h3 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-800 mb-2">{trip.title}</h3>
                            <span
                              className={`px-2 sm:px-3 py-1 rounded-[20px] text-xs font-semibold ${
                                trip.status === 'upcoming'
                                  ? 'bg-blue-100 text-blue-800'
                                  : trip.status === 'ongoing'
                                  ? 'bg-amber-100 text-amber-800'
                                  : trip.status === 'completed'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {trip.status}
                            </span>
                          </div>
                          <div className="flex gap-2 mt-2 sm:mt-0">
                            {trip.status === 'upcoming' && (
                              <button
                                onClick={() => cancelTrip(trip._id)}
                                className="px-3 sm:px-4 py-2 bg-red-500 text-white rounded-lg font-semibold text-xs sm:text-sm hover:bg-red-600 transition-all flex items-center gap-2"
                              >
                                <i className="fas fa-times"></i> Cancel
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
                          <div className="flex items-center gap-2 text-gray-600 text-sm">
                            <i className="fas fa-map-marker-alt text-blue-500 w-4"></i>
                            <span>
                              {trip.from} → {trip.to}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600 text-sm">
                            <i className="fas fa-calendar text-blue-500 w-4"></i>
                            <span>
                              {new Date(trip.startDate).toLocaleDateString()} -{' '}
                              {new Date(trip.endDate).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600 text-sm">
                            <i className="fas fa-users text-blue-500 w-4"></i>
                            <span>{trip.availableSeats || trip.seats} seats available</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600 text-sm">
                            <i className="fas fa-dollar-sign text-blue-500 w-4"></i>
                            <span>${trip.pricePerPerson} per person</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600 text-sm">
                            <i className={`fas ${getTransportIcon(trip.modeOfTransport)} text-blue-500 w-4`}></i>
                            <span>{trip.modeOfTransport}</span>
                          </div>
                        </div>
                        {trip.bookings && trip.bookings.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <h4 className="text-sm sm:text-base text-gray-800 mb-3 font-semibold">
                              Bookings ({trip.bookings.length})
                            </h4>
                            {trip.bookings.map((booking) => (
                              <div
                                key={booking._id}
                                className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-2 px-3 bg-gray-50 rounded-lg mb-2 text-sm"
                              >
                                <div className="flex-1 flex flex-col sm:flex-row sm:items-center sm:gap-4">
                                  <span>{booking.user?.email || 'Unknown User'}</span>
                                  <span>{booking.seatsBooked} seats</span>
                                  <span
                                    className={`px-2 py-1 rounded-xl text-xs font-semibold ${
                                      booking.status === 'pending'
                                        ? 'bg-blue-100 text-blue-800'
                                        : booking.status === 'confirmed'
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-red-100 text-red-800'
                                    }`}
                                  >
                                    {booking.status}
                                  </span>
                                </div>
                                {booking.status === 'pending' && (
                                  <div className="flex gap-1 mt-2 sm:mt-0">
                                    <button
                                      onClick={() => acceptBooking(trip._id, booking._id)}
                                      className="px-2 sm:px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700"
                                    >
                                      Accept
                                    </button>
                                    <button
                                      onClick={() => rejectBooking(trip._id, booking._id)}
                                      className="px-2 sm:px-3 py-1 bg-red-500 text-white rounded-lg text-xs font-semibold hover:bg-red-600"
                                    >
                                      Reject
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {/* My Bookings Tab */}
          {currentTab === 'bookings' && (
            <>
              <div className="flex flex-col sm:flex-row justify-between items-center mb-6 sm:mb-8 pb-4 border-b border-gray-200">
                <h2 className="text-xl sm:text-2xl md:text-3xl text-gray-800 m-0">My Bookings</h2>
                <div className="flex gap-2 mt-4 sm:mt-0 flex-wrap">
                  {['all', 'upcoming', 'past', 'cancelled'].map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setActiveFilter({ ...activeFilter, bookings: filter })}
                      className={`px-3 sm:px-4 py-2 border rounded-[20px] text-xs sm:text-sm transition-all duration-300 ${
                        activeFilter.bookings === filter
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-600 hover:text-indigo-600'
                      }`}
                    >
                      {filter.charAt(0).toUpperCase() + filter.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-4 sm:gap-6">
                {getFilteredBookings().length === 0 ? (
                  <div className="text-center py-8 sm:py-12 text-gray-600">
                    <i className="fas fa-ticket-alt text-4xl sm:text-5xl text-gray-300 mb-4"></i>
                    <h3 className="text-lg sm:text-xl md:text-2xl mb-2 text-gray-800">No Bookings Yet</h3>
                    <p className="mb-4 sm:mb-6 text-sm sm:text-base">
                      You haven't joined any trips yet. Discover exciting adventures in the Discover tab!
                    </p>
                    <button
                      onClick={() => {
                        setCurrentTab('discover');
                        setIsSidebarOpen(false);
                      }}
                      className="px-4 sm:px-6 py-2 sm:py-3 bg-indigo-600 text-white rounded-lg font-semibold text-sm sm:text-base hover:bg-indigo-700 transition-all"
                    >
                      Discover Trips
                    </button>
                  </div>
                ) : (
                  getFilteredBookings().map((booking) => (
                    <div
                      key={booking._id}
                      className="bg-white rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-200 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl"
                    >
                      <div className="flex flex-col sm:flex-row justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-800 mb-2">{booking.title}</h3>
                          <span
                            className={`px-2 sm:px-3 py-1 rounded-[20px] text-xs font-semibold ${
                              getBookingStatus(booking) === 'upcoming'
                                ? 'bg-blue-100 text-blue-800'
                                : getBookingStatus(booking) === 'completed'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {getBookingStatus(booking)}
                          </span>
                        </div>
                        <div className="flex gap-2 mt-2 sm:mt-0">
                          {booking.isUpcoming && !booking.isCancelled && (
                            <button
                              onClick={() => cancelBooking(booking._id)}
                              className="px-3 sm:px-4 py-2 bg-red-500 text-white rounded-lg font-semibold text-xs sm:text-sm hover:bg-red-600 transition-all flex items-center gap-2"
                            >
                              <i className="fas fa-times"></i> Cancel
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div className="flex items-center gap-2 text-gray-600 text-sm">
                          <i className="fas fa-map-marker-alt text-blue-500 w-4"></i>
                          <span>
                            {booking.from} → {booking.to}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600 text-sm">
                          <i className="fas fa-calendar text-blue-500 w-4"></i>
                          <span>
                            {new Date(booking.startDate).toLocaleDateString()} -{' '}
                            {new Date(booking.endDate).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600 text-sm">
                          <i className="fas fa-user text-blue-500 w-4"></i>
                          <span>Created by: {booking.createdBy?.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600 text-sm">
                          <i className="fas fa-ticket-alt text-blue-500 w-4"></i>
                          <span>{booking.mySeatsBooked} seats booked</span>
                        </div>
                        {booking.daysLeft > 0 && (
                          <div className="flex items-center gap-2 text-gray-600 text-sm">
                            <i className="fas fa-clock text-blue-500 w-4"></i>
                            <span>{booking.daysLeft} days left</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {/* Discover Tab */}
          {currentTab === 'discover' && (
            <>
              <div className="mb-6 sm:mb-8 pb-4 border-b border-gray-200">
                <h2 className="text-xl sm:text-2xl md:text-3xl text-gray-800 m-0">Discover Trips</h2>
              </div>
              <div className="flex flex-col gap-4 sm:gap-6">
                {availableTrips.length === 0 ? (
                  <div className="text-center py-8 sm:py-12 text-gray-600">
                    <i className="fas fa-search text-4xl sm:text-5xl text-gray-300 mb-4"></i>
                    <h3 className="text-lg sm:text-xl md:text-2xl mb-2 text-gray-800">No Trips Available</h3>
                    <p className="mb-4 sm:mb-6 text-sm sm:text-base">
                      No trips are currently available. Check back later or create your own trip!
                    </p>
                    <button
                      onClick={() => {
                        setCurrentTab('create');
                        setIsSidebarOpen(false);
                      }}
                      className="px-4 sm:px-6 py-2 sm:py-3 bg-indigo-600 text-white rounded-lg font-semibold text-sm sm:text-base hover:bg-indigo-700 transition-all"
                    >
                      Create Trip
                    </button>
                  </div>
                ) : (
                  availableTrips.map((trip) => (
                    <div
                      key={trip._id}
                      className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl"
                    >
                      {trip.image && trip.image.trim() && (
                        <div className="h-48 sm:h-60 overflow-hidden">
                          <img
                            src={trip.image}
                            alt={trip.title}
                            onError={(e) => (e.target.style.display = 'none')}
                            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                            loading="lazy"
                          />
                        </div>
                      )}
                      <div className="p-4 sm:p-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start mb-4">
                          <div>
                            <h3 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-800 mb-2">{trip.title}</h3>
                            <span
                              className={`px-2 sm:px-3 py-1 rounded-[20px] text-xs font-semibold ${
                                trip.status === 'upcoming' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {trip.status}
                            </span>
                          </div>
                          <div className="flex gap-2 mt-2 sm:mt-0">
                            <button
                              onClick={() => {
                                setSelectedTripId(trip._id);
                                setShowJoinModal(true);
                              }}
                              className="px-3 sm:px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold text-xs sm:text-sm hover:bg-indigo-700 transition-all flex items-center gap-2"
                            >
                              <i className="fas fa-plus"></i> Join Trip
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                          <div className="flex items-center gap-2 text-gray-600 text-sm">
                            <i className="fas fa-map-marker-alt text-blue-500 w-4"></i>
                            <span>
                              {trip.from} → {trip.to}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600 text-sm">
                            <i className="fas fa-calendar text-blue-500 w-4"></i>
                            <span>
                              {new Date(trip.startDate).toLocaleDateString()} -{' '}
                              {new Date(trip.endDate).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600 text-sm">
                            <i className="fas fa-users text-blue-500 w-4"></i>
                            <span>{trip.availableSeats} seats available</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600 text-sm">
                            <i className="fas fa-dollar-sign text-blue-500 w-4"></i>
                            <span>${trip.pricePerPerson} per person</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600 text-sm">
                            <i className={`fas ${getTransportIcon(trip.modeOfTransport)} text-blue-500 w-4`}></i>
                            <span>{trip.modeOfTransport}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600 text-sm">
                            <i className="fas fa-user text-blue-500 w-4"></i>
                            <span>By: {trip.createdBy?.email}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {/* Create Trip Tab */}
          {currentTab === 'create' && (
            <>
              <div className="mb-6 sm:mb-8 pb-4 border-b border-gray-200">
                <h2 className="text-xl sm:text-2xl md:text-3xl text-gray-800 m-0">Create New Trip</h2>
              </div>
              <form
                onSubmit={handleTripCreation}
                className="bg-white rounded-2xl p-4 sm:p-6 md:p-8 shadow-lg max-w-full sm:max-w-[800px]"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
                  <div>
                    <label className="block mb-2 font-semibold text-gray-800 text-sm sm:text-base">Trip Title</label>
                    <input
                      type="text"
                      name="title"
                      required
                      className="w-full px-3 py-3 border border-gray-300 rounded-lg text-sm sm:text-base transition-colors focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                  <div>
                    <label className="block mb-2 font-semibold text-gray-800 text-sm sm:text-base">Mode of Transport</label>
                    <select
                      name="modeOfTransport"
                      required
                      className="w-full px-3 py-3 border border-gray-300 rounded-lg text-sm sm:text-base transition-colors focus:outline-none focus:border-indigo-600"
                    >
                      <option value="">Select Transport</option>
                      <option value="bus">Bus</option>
                      <option value="railway">Railway</option>
                      <option value="airplane">Airplane</option>
                      <option value="car">Car</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
                  <div>
                    <label className="block mb-2 font-semibold text-gray-800 text-sm sm:text-base">From</label>
                    <input
                      type="text"
                      name="from"
                      required
                      className="w-full px-3 py-3 border border-gray-300 rounded-lg text-sm sm:text-base transition-colors focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                  <div>
                    <label className="block mb-2 font-semibold text-gray-800 text-sm sm:text-base">To</label>
                    <input
                      type="text"
                      name="to"
                      required
                      className="w-full px-3 py-3 border border-gray-300 rounded-lg text-sm sm:text-base transition-colors focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
                  <div>
                    <label className="block mb-2 font-semibold text-gray-800 text-sm sm:text-base">Start Date</label>
                    <input
                      type="datetime-local"
                      name="startDate"
                      required
                      min={new Date().toISOString().slice(0, 16)}
                      className="w-full px-3 py-3 border border-gray-300 rounded-lg text-sm sm:text-base transition-colors focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                  <div>
                    <label className="block mb-2 font-semibold text-gray-800 text-sm sm:text-base">End Date</label>
                    <input
                      type="datetime-local"
                      name="endDate"
                      required
                      min={new Date().toISOString().slice(0, 16)}
                      className="w-full px-3 py-3 border border-gray-300 rounded-lg text-sm sm:text-base transition-colors focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
                  <div>
                    <label className="block mb-2 font-semibold text-gray-800 text-sm sm:text-base">Available Seats</label>
                    <input
                      type="number"
                      name="seats"
                      min="1"
                      required
                      className="w-full px-3 py-3 border border-gray-300 rounded-lg text-sm sm:text-base transition-colors focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                  <div>
                    <label className="block mb-2 font-semibold text-gray-800 text-sm sm:text-base">Price per Person</label>
                    <input
                      type="number"
                      name="pricePerPerson"
                      min="0"
                      max="100000"
                      step="0.01"
                      required
                      className="w-full px-3 py-3 border border-gray-300 rounded-lg text-sm sm:text-base transition-colors focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                </div>
                <div className="mb-4 sm:mb-6">
                  <label className="block mb-2 font-semibold text-gray-800 text-sm sm:text-base">Phone Number</label>
                  <input
                    type="tel"
                    name="phoneNo"
                    required
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg text-sm sm:text-base transition-colors focus:outline-none focus:border-indigo-600"
                  />
                </div>
                <div className="mb-4 sm:mb-6">
                  <label className="block mb-2 font-semibold text-gray-800 text-sm sm:text-base">Image URL (Optional)</label>
                  <input
                    type="url"
                    name="image"
                    placeholder="https://example.com/image.jpg"
                    className="w-full px-3 py-3 border border-gray-300 rounded-lg text-sm sm:text-base transition-colors focus:outline-none focus:border-indigo-600"
                  />
                  <small className="block mt-1 text-xs text-gray-600 italic">
                    Leave empty if you don't have an image
                  </small>
                </div>
                <button
                  type="submit"
                  className="w-full px-4 py-3 sm:py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg text-sm sm:text-base font-semibold transition-all hover:from-indigo-700 hover:to-purple-700 hover:-translate-y-0.5"
                >
                  Create Trip
                </button>
              </form>
            </>
          )}
        </div>
      </main>

      {/* Join Trip Modal */}
      {showJoinModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] p-4"
          onClick={() => setShowJoinModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-4 sm:p-6 md:p-8 max-w-md w-full sm:w-[90%]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4 sm:mb-6 pb-4 border-b border-gray-200">
              <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 m-0">Join Trip</h3>
              <button
                onClick={() => setShowJoinModal(false)}
                className="text-xl sm:text-2xl text-gray-600 hover:text-gray-800 border-none bg-transparent cursor-pointer"
              >
                &times;
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const seatsBooked = e.target.seatsBooked.value;
                handleJoinTrip(seatsBooked);
              }}
            >
              <div className="mb-4 sm:mb-6">
                <label className="block mb-2 font-semibold text-gray-800 text-sm sm:text-base">Number of Seats</label>
                <input
                  type="number"
                  name="seatsBooked"
                  min="1"
                  required
                  className="w-full px-3 py-3 border border-gray-300 rounded-lg text-sm sm:text-base transition-colors focus:outline-none focus:border-indigo-600"
                />
              </div>
              <button
                type="submit"
                className="w-full px-4 py-3 sm:py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg text-sm sm:text-base font-semibold transition-all hover:from-indigo-700 hover:to-purple-700"
              >
                Join Trip
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Search Results Modal */}
      {showSearchModal && searchResults && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] overflow-y-auto p-4"
          onClick={() => {
            setShowSearchModal(false);
            setSearchResults(null);
            setSearchQuery('');
          }}
        >
          <div
            className="bg-white rounded-2xl p-4 sm:p-6 md:p-8 max-w-4xl w-full sm:w-[90%] max-h-[90vh] overflow-y-auto my-4 sm:my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4 sm:mb-6 pb-4 border-b border-gray-200 sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 m-0">
                  Search Results for "{searchResults.city}"
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">
                  Found {searchResults.places.length} place{searchResults.places.length !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowSearchModal(false);
                  setSearchResults(null);
                  setSearchQuery('');
                }}
                className="text-xl sm:text-2xl md:text-3xl text-gray-600 hover:text-gray-800 border-none bg-transparent cursor-pointer leading-none p-2 hover:bg-gray-100 rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center transition-all"
                aria-label="Close"
              >
                &times;
              </button>
            </div>
            <div className="space-y-4">
              {searchResults.places.length === 0 ? (
                <div className="text-center py-6 sm:py-8 text-gray-600">
                  <i className="fas fa-search text-3xl sm:text-4xl text-gray-300 mb-4"></i>
                  <p className="text-sm sm:text-base">No places found for "{searchResults.city}"</p>
                </div>
              ) : (
                searchResults.places.map((place, index) => (
                  <div
                    key={index}
                    className="flex gap-3 sm:gap-4 p-3 sm:p-4 border border-gray-200 rounded-xl hover:shadow-lg transition-all hover:border-indigo-300 bg-white cursor-pointer"
                    onClick={() => {
                      setSearchQuery(place.name);
                      setShowSearchModal(false);
                      setCurrentTab('discover');
                      setIsSidebarOpen(false);
                    }}
                  >
                    <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 shrink-0 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                      {place.image ? (
                        <img
                          src={place.image}
                          alt={place.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            const parent = e.target.parentElement;
                            if (parent && !parent.querySelector('.no-image-placeholder')) {
                              const placeholder = document.createElement('div');
                              placeholder.className =
                                'no-image-placeholder w-full h-full flex items-center justify-center text-gray-400 text-xs flex-col';
                              placeholder.innerHTML =
                                '<i class="fas fa-image text-lg sm:text-xl md:text-2xl mb-1"></i><span>No Image</span>';
                              parent.appendChild(placeholder);
                            }
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs flex-col">
                          <i className="fas fa-image text-lg sm:text-xl md:text-2xl mb-1"></i>
                          <span>No Image</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-base sm:text-lg text-gray-800 mb-1 sm:mb-2 truncate">{place.name}</h4>
                      <p className="text-xs sm:text-sm text-gray-600 mb-1 sm:mb-2 line-clamp-2">{place.address}</p>
                      {place.rating && (
                        <div className="flex items-center gap-1 text-amber-500 font-semibold text-xs sm:text-sm">
                          <i className="fas fa-star"></i>
                          <span>{place.rating.toFixed(1)}</span>
                          <span className="text-gray-400 text-xs ml-1">/ 5.0</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-20px) rotate(180deg);
          }
        }
        .animate-slideIn {
          animation: slideIn 0.4s ease;
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        /* Ensure sidebar doesn't overlap content when open */
        @media (max-width: 640px) {
          body:has(.translate-x-0) {
            overflow: hidden;
          }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;