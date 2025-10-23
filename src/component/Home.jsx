import { useState, useEffect, useRef } from 'react';
import{Link} from 'react-router-dom';
export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [navScrolled, setNavScrolled] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [currentSlide, setCurrentSlide] = useState(0);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [statsVisible, setStatsVisible] = useState(false);
  const [stats, setStats] = useState({ trips: 0, cities: 0, travelers: 0 });
  
  const trackRef = useRef(null);
  const carouselRef = useRef(null);
  const autoSlideRef = useRef(null);
  const statsRef = useRef(null);

  const heroImages = [
    'https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=1600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1493558103817-58b2924bce98?q=80&w=1600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1505761671935-60b3a7427bad?q=80&w=1600&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=1600&auto=format&fit=crop'
  ];

  const destinations = [
    { name: 'Paris, France', img: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=1200&auto=format&fit=crop' },
    { name: 'Tokyo, Japan', img: 'https://images.unsplash.com/photo-1568084680786-a84f91d1153c?q=80&w=1200&auto=format&fit=crop' },
    { name: 'Bali, Indonesia', img: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?q=80&w=1200&auto=format&fit=crop' },
    { name: 'Iceland', img: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1200&auto=format&fit=crop' },
    { name: 'New York, USA', img: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?q=80&w=1200&auto=format&fit=crop' },
    { name: 'Dubai, UAE', img: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=1200&auto=format&fit=crop' },
    { name: 'Santorini, Greece', img: 'https://images.unsplash.com/photo-1505159940484-eb2b9f2588e2?q=80&w=1200&auto=format&fit=crop' }
  ];

  const testimonials = [
    {
      name: 'Aditi',
      country: 'Japan',
      img: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?q=80&w=600&auto=format&fit=crop',
      text: 'Ghumakkad made my Japan trip flawless. The itinerary suggestions for Kyoto and Tokyo were spot-on, from exploring ancient temples to vibrant markets. The community feature connected me with locals who shared hidden gems. Cant wait for my next adventure with Ghumakkad!'
    },
    {
      name: 'Diego',
      country: 'Bali',
      img: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?q=80&w=600&auto=format&fit=crop',
      text: `Found an amazing group for Bali through Ghumakkad. The trip to Ubud and the rice terraces was unforgettable, and the group was so friendly. Everything felt safe and well-organized. Im already planning my next trip to Thailand with them. 10/10!`
    },
    {
      name: 'Leah',
      country: 'Paris',
      img: 'https://images.unsplash.com/photo-1505761671935-60b3a7427bad?q=80&w=600&auto=format&fit=crop',
      text: 'Planning my Paris trip with Ghumakkad was a breeze. The UI is gorgeous, and the team responded to my queries in minutes. Strolling along the Seine and visiting cozy cafés with my travel buddies was a dream. Highly recommend for solo travelers!'
    },
    {
      name: 'Rahul',
      country: 'Iceland',
      img: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=600&auto=format&fit=crop',
      text: `Ghumakkad's itineraries for Iceland balanced adventure and relaxation perfectly. Chasing the Northern Lights and exploring waterfalls with a fun group was incredible. The platforms community vibe made it easy to connect with like-minded travelers. Loved every moment!`
    }
  ];

  
  useEffect(() => {
    const handleScroll = () => {
      const h = document.documentElement;
      const scrolled = h.scrollTop / (h.scrollHeight - h.clientHeight);
      setScrollProgress(scrolled * 100);
      setNavScrolled(window.scrollY > 60);
      setShowBackToTop(window.scrollY > 500);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Cursor tracking
  useEffect(() => {
    const handleMouseMove = (e) => {
      setCursorPos({ x: e.clientX - 100, y: e.clientY - 100 });
    };
    window.addEventListener('pointermove', handleMouseMove);
    return () => window.removeEventListener('pointermove', handleMouseMove);
  }, []);

  // Hero slideshow with smooth transitions
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroImages.length);
    }, 5000); // Changed to 5 seconds for better pacing
    return () => clearInterval(interval);
  }, [heroImages.length]);

  // Carousel auto-slide
  useEffect(() => {
    const startAutoSlide = () => {
      autoSlideRef.current = setInterval(() => {
        setCarouselIndex((prev) => prev + 1);
      }, 4000);
    };

    startAutoSlide();
    return () => clearInterval(autoSlideRef.current);
  }, []);

  // Stats counter animation
  useEffect(() => {
    if (!statsVisible) return;

    const animateValue = (start, end, duration, key) => {
      const startTime = Date.now();
      const step = () => {
        const now = Date.now();
        const progress = Math.min((now - startTime) / duration, 1);
        // Easing function for smooth animation
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const value = Math.floor(easeOutQuart * (end - start) + start);
        setStats((prev) => ({ ...prev, [key]: value }));
        if (progress < 1) requestAnimationFrame(step);
      };
      step();
    };

    animateValue(0, 1200, 2500, 'trips');
    animateValue(0, 320, 2500, 'cities');
    animateValue(0, 48000, 2500, 'travelers');
  }, [statsVisible]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setStatsVisible(true);
          }
        });
      },
      { threshold: 0.4 }
    );

    if (statsRef.current) {
      observer.observe(statsRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Carousel transition handling
  useEffect(() => {
    if (!trackRef.current) return;
    const currTrack = trackRef.current;
    const handleTransitionEnd = () => {
      if (carouselIndex >= destinations.length) {
        currTrack.style.transition = 'none';
        setCarouselIndex(0);
        setTimeout(() => {
          currTrack.style.transition = 'transform 0.6s ease-in-out';
        }, 50);
      } else if (carouselIndex < 0) {
        currTrack.style.transition = 'none';
        setCarouselIndex(destinations.length - 1);
        setTimeout(() => {
          currTrack.style.transition = 'transform 0.6s ease-in-out';
        }, 50);
      }
    };
    currTrack.addEventListener('transitionend', handleTransitionEnd);
    return () => currTrack.removeEventListener('transitionend', handleTransitionEnd);
  }, [carouselIndex, destinations.length]);

  const handleCarouselNext = () => {
    clearInterval(autoSlideRef.current);
    setCarouselIndex((prev) => prev + 1);
    setTimeout(() => {
      autoSlideRef.current = setInterval(() => {
        setCarouselIndex((prev) => prev + 1);
      }, 4000);
    }, 600);
  };

  const handleCarouselPrev = () => {
    clearInterval(autoSlideRef.current);
    setCarouselIndex((prev) => prev - 1);
    setTimeout(() => {
      autoSlideRef.current = setInterval(() => {
        setCarouselIndex((prev) => prev + 1);
      }, 4000);
    }, 600);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#0f1220] text-white font-['Poppins',system-ui,sans-serif] overflow-x-hidden">
      {/* Scroll Progress */}
      <div
        className="fixed top-0 left-0 h-1 z-1000 bg-linear-to-r from-violet-600 via-cyan-500 to-amber-500"
        style={{ width: `${scrollProgress}%` }}
      />

    
      <nav className={`fixed top-0 left-0 w-full flex items-center justify-between gap-3 px-[4vw] py-3.5 z-900 transition-all duration-300 ${navScrolled ? 'backdrop-blur-xl bg-[rgba(10,12,22,0.55)] shadow-[0_10px_30px_rgba(0,0,0,0.35)]' : ''}`}>
        <div className="flex items-center gap-3 font-extrabold tracking-wide">
          <div className="text-3xl w-9 h-9 grid place-items-center rounded-xl bg-linear-to-br from-violet-600 to-cyan-500 shadow-[0_6px_16px_rgba(124,58,237,0.45)]">
            ✈
          </div>
          Ghumakkad
        </div>
        
        <ul className="hidden lg:flex list-none gap-5 m-0 p-0">
          <li><a onClick={() => scrollToSection('home')} className="opacity-90 font-medium hover:opacity-100 hover:underline cursor-pointer">Home</a></li>
          <li><a onClick={() => scrollToSection('highlights')} className="opacity-90 font-medium hover:opacity-100 hover:underline cursor-pointer">How it Works</a></li>
          <li><a onClick={() => scrollToSection('mosaic')} className="opacity-90 font-medium hover:opacity-100 hover:underline cursor-pointer">Gallery</a></li>
          <li><a onClick={() => scrollToSection('destinations')} className="opacity-90 font-medium hover:opacity-100 hover:underline cursor-pointer">Destinations</a></li>
          <li><a onClick={() => scrollToSection('reviews')} className="opacity-90 font-medium hover:opacity-100 hover:underline cursor-pointer">Reviews</a></li>
          <li><Link to='/contact' className="opacity-90 font-medium hover:opacity-100 hover:underline cursor-pointer">Contact</Link></li>
          <li><Link to='/login' className="px-4 py-2.5 rounded-full bg-blueviolet text-white shadow-[0_10px_24px_rgba(124,58,237,0.35)] hover:scale-105 transition-transform">Join a Trip</Link></li>
        </ul>

        <div className="lg:hidden cursor-pointer bg-[rgba(255,255,255,0.06)] px-3.5 py-2.5 rounded-xl text-xl" onClick={() => setMenuOpen(!menuOpen)}>
          ☰
        </div>
      </nav>

    
      {menuOpen && (
        <div className="fixed right-4 top-[70px] bg-[rgba(20,22,34,0.9)] backdrop-blur-xl border border-[rgba(255,255,255,0.08)] p-4 rounded-2xl z-900">
          <a onClick={() => scrollToSection('home')} className="block py-2.5 px-2 rounded-lg hover:bg-[rgba(255,255,255,0.08)] cursor-pointer">Home</a>
          <a onClick={() => scrollToSection('highlights')} className="block py-2.5 px-2 rounded-lg hover:bg-[rgba(255,255,255,0.08)] cursor-pointer">How it Works</a>
          <a onClick={() => scrollToSection('mosaic')} className="block py-2.5 px-2 rounded-lg hover:bg-[rgba(255,255,255,0.08)] cursor-pointer">Gallery</a>
          <a onClick={() => scrollToSection('destinations')} className="block py-2.5 px-2 rounded-lg hover:bg-[rgba(255,255,255,0.08)] cursor-pointer">Destinations</a>
          <a onClick={() => scrollToSection('reviews')} className="block py-2.5 px-2 rounded-lg hover:bg-[rgba(255,255,255,0.08)] cursor-pointer">Reviews</a>
          <Link to='/contact' className="block py-2.5 px-2 rounded-lg hover:bg-[rgba(255,255,255,0.08)] cursor-pointer">Contact</Link>
          <Link to='/login' className="block py-2.5 px-2 rounded-lg hover:bg-[rgba(255,255,255,0.08)] cursor-pointer">Join a Trip</Link>
        </div>
      )}

  
      <header id="home" className="min-h-screen relative flex items-center px-[6vw] pt-[18vh] pb-[10vh] overflow-hidden">
        <div className="absolute inset-0 z-0">
          {heroImages.map((img, idx) => (
            <div
              key={idx}
              className="absolute inset-0 bg-cover bg-center hero-slide"
              style={{
                backgroundImage: `url(${img})`,
                opacity: currentSlide === idx ? 1 : 0,
                transition: 'opacity 2s ease-in-out',
                transform: currentSlide === idx ? 'scale(1.1)' : 'scale(1.05)'
              }}
            />
          ))}
          
          <div className="absolute inset-0 bg-black/30 z-1"></div>
        </div>
        
        <div className="relative z-10 max-w-[50%] lg:max-w-[50%] md:max-w-full p-6">
          <h1 className="text-4xl md:text-5xl lg:text-6xl leading-tight m-0 text-white [text-shadow:2px_2px_8px_rgba(0,0,0,0.7)]">
            Find your travel buddy — plan, join & explore together.
          </h1>
          <p className="text-white [text-shadow:2px_2px_6px_rgba(0,0,0,0.7)] my-4 max-w-[60ch]">
            With Ghumakkad you can plan your trip, invite fellow travelers, or join someone else's adventure. A community of explorers, traveling smarter and safer — together.
          </p>
          <a
            href="#"
            className="inline-flex items-center gap-2.5 px-5 py-3.5 rounded-2xl border border-[rgba(255,255,255,0.12)] bg-linear-to-br from-[#d0f0ff] via-[#4db5e7] to-[#1fa2ff] text-white shadow-[0_10px_30px_rgba(0,0,0,0.35)] hover:translate-y-[-2px] hover:saturate-120 transition-all duration-250"
          >
            Explore Trips →
          </a>
          <div className="mt-4 flex flex-wrap gap-2.5">
            <span className="px-3 py-2 rounded-full bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.12)] text-sm text-[#e6f7ff]">Plan Your Trip</span>
            <span className="px-3 py-2 rounded-full bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.12)] text-sm text-[#e6f7ff]">Join a Community</span>
            <span className="px-3 py-2 rounded-full bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.12)] text-sm text-[#e6f7ff]">Travel Together</span>
          </div>
        </div>
      </header>

   
      <section id="highlights" className="py-[8vh] px-[6vw]">
        <h2 className="text-3xl lg:text-4xl mb-5">How Ghumakkad Works</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {[
            { icon: '🗺', title: 'Plan a Trip', desc: 'Create itineraries, choose dates, and invite buddies.', more: 'You can customize destinations, share with friends, and get suggestions tailored for your travel style.' },
            { icon: '🤝', title: 'Join a Trip', desc: 'Browse trips planned by others and join the adventure.', more: 'Filter by location, duration, or group type to find the perfect journey with like-minded explorers.' },
            { icon: '🌍', title: 'Community First', desc: 'Verified travelers, safe groups, and real connections.', more: 'Engage in forums, share reviews, and build long-term friendships through authentic travel experiences.' }
          ].map((item, idx) => (
            <div key={idx} className="group bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] rounded-[22px] p-5 shadow-[0_10px_30px_rgba(0,0,0,0.35)] backdrop-blur-xl transition-all duration-250 hover:translate-y-[-6px] hover:shadow-[0_18px_36px_rgba(0,0,0,0.35)] overflow-hidden max-h-[220px] hover:max-h-[400px]">
              <div className="text-2xl w-10 h-10 grid place-items-center rounded-xl bg-violet-600 mb-3">{item.icon}</div>
              <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
              <p className="text-[#a9b1c3]">{item.desc}</p>
              <div className="opacity-0 max-h-0 overflow-hidden transition-all duration-400 mt-2.5 group-hover:opacity-100 group-hover:max-h-[200px]">
                <p className="text-[#a9b1c3]">{item.more}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

     
      <section id="mosaic" className="py-[8vh] px-[6vw]">
        <h2 className="text-3xl lg:text-4xl mb-5">Aesthetic Moments from the Road</h2>
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr_1fr] gap-4">
          {[
            'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1200&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1505761671935-60b3a7427bad?q=80&w=1200&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?q=80&w=1200&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=1200&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1501785888041-af3ef285b470?q=80&w=1200&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1493558103817-58b2924bce98?q=80&w=1200&auto=format&fit=crop'
          ].map((img, idx) => (
            <div key={idx} className="rounded-2xl overflow-hidden relative h-[280px] bg-[#111] border border-[rgba(255,255,255,0.06)]">
              <img src={img} alt="" className="w-full h-full object-cover scale-105 hover:scale-110 transition-transform duration-800" loading="lazy" />
            </div>
          ))}
        </div>
      </section>

 
      <section id="destinations" className="py-[8vh] px-[6vw]">
        <h2 className="text-3xl lg:text-4xl mb-5">Popular Destinations</h2>
        <div className="relative overflow-hidden" ref={carouselRef}>
          <div
            ref={trackRef}
            className="flex transition-transform duration-600 ease-in-out"
            style={{ transform: `translateX(${-carouselIndex * 380}px)` }}
          >
            {[...destinations, ...destinations].map((dest, idx) => (
              <div
                key={idx}
                className="shrink-0 w-[360px] h-[320px] mx-2.5 bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] rounded-[22px] overflow-hidden relative cursor-pointer shadow-[0_10px_30px_rgba(0,0,0,0.35)] hover:translate-y-[-8px] hover:scale-105 transition-all duration-300 group"
              >
                <img src={dest.img} alt={dest.name} className="w-full h-full object-cover absolute inset-0 group-hover:opacity-0 group-hover:scale-110 transition-all duration-600" loading="eager" />
                <div className="absolute inset-0 flex flex-col items-center justify-center p-5 text-center opacity-0 translate-y-5 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-600">
                  <h3 className="text-2xl font-semibold mb-2.5">{dest.name}</h3>
                  <p className="text-[#a9b1c3] mb-3.5">From ₹29,999 • 6D/5N</p>
                  <button className="px-4 py-2.5 rounded-full bg-linear-to-br from-cyan-500 to-violet-600 text-white cursor-pointer hover:scale-110 transition-transform duration-250">
                    Join Trip
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={handleCarouselPrev}
            className="absolute top-1/2 left-2.5 -translate-y-1/2 bg-[rgba(0,0,0,0.4)] border-none rounded-full w-10 h-10 text-white text-xl cursor-pointer z-10 hover:bg-[rgba(0,0,0,0.6)] transition-colors duration-250"
          >
            ◀
          </button>
          <button
            onClick={handleCarouselNext}
            className="absolute top-1/2 right-2.5 -translate-y-1/2 bg-[rgba(0,0,0,0.4)] border-none rounded-full w-10 h-10 text-white text-xl cursor-pointer z-10 hover:bg-[rgba(0,0,0,0.6)] transition-colors duration-250"
          >
            ▶
          </button>
        </div>
      </section>

     \
      <section className="py-[8vh] px-[6vw]" ref={statsRef}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.08)] p-5 rounded-2xl text-center">
            <span className="text-[#a9b1c3]">Trips Hosted</span>
            <h3 className="text-3xl font-bold my-1.5">{stats.trips.toLocaleString()}</h3>
          </div>
          <div className="bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.08)] p-5 rounded-2xl text-center">
            <span className="text-[#a9b1c3]">Cities Covered</span>
            <h3 className="text-3xl font-bold my-1.5">{stats.cities.toLocaleString()}</h3>
          </div>
          <div className="bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.08)] p-5 rounded-2xl text-center">
            <span className="text-[#a9b1c3]">Travelers</span>
            <h3 className="text-3xl font-bold my-1.5">{stats.travelers.toLocaleString()}</h3>
          </div>
          <div className="bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.08)] p-5 rounded-2xl text-center">
            <span className="text-[#a9b1c3]">Avg. Rating</span>
            <h3 className="text-3xl font-bold my-1.5">4.9★</h3>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="reviews" className="py-[8vh] px-[6vw]">
        <h2 className="text-3xl lg:text-4xl mb-5">Loved by explorers everywhere</h2>
        <div className="flex gap-4 overflow-x-auto no-scrollbar">
          {testimonials.map((t, idx) => (
            <article key={idx} className="min-w-[360px] bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.08)] rounded-2xl p-4">
              <img src={t.img} alt={t.country} className="w-full h-[120px] object-cover rounded-xl border border-[rgba(255,255,255,0.12)] mb-3" loading="lazy" />
              <div className="flex items-center gap-3 mb-2.5">
                <div className="w-10 h-10 rounded-full bg-linear-to-br from-green-500 to-cyan-500"></div>
                <strong>{t.name}</strong>
              </div>
              <p className="text-[#a9b1c3] leading-relaxed">{t.text}</p>
            </article>
          ))}
        </div>
      </section>

   
      <section id="join" className="py-[8vh] px-[6vw] text-center">
        <Link to='/login' className="inline-flex items-center gap-2.5 px-7 py-4 rounded-2xl text-lg bg-blueviolet text-white shadow-[0_10px_30px_rgba(0,0,0,0.35)] hover:translate-y-[-2px] hover:saturate-120 transition-all duration-250">
          Explore Now →
        </Link>
      </section>

   
      <footer className="py-[10vh] px-[6vw] border-t border-[rgba(255,255,255,0.06)] bg-[rgba(0,0,0,0.35)]">
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr_1fr] gap-6">
          <div>
            <h4 className="mb-2.5 text-lg font-semibold">Ghumakkad</h4>
            <p className="text-[#a9b1c3]">We help you explore the world with style, safety, and a community that feels like friends.</p>
            <div className="flex gap-3 mt-3">
              <a href="#" className="text-xl text-[#a9b1c3] hover:text-cyan-500 transition-colors">📘</a>
              <a href="#" className="text-xl text-[#a9b1c3] hover:text-cyan-500 transition-colors">🐦</a>
              <a href="#" className="text-xl text-[#a9b1c3] hover:text-cyan-500 transition-colors">📷</a>
              <a href="#" className="text-xl text-[#a9b1c3] hover:text-cyan-500 transition-colors">💼</a>
            </div>
          </div>
          <div>
            <h4 className="mb-2.5 text-lg font-semibold">Company</h4>
            <a href="#" className="block text-[#a9b1c3] py-1.5 hover:text-white transition-colors">About</a>
            <a href="#" className="block text-[#a9b1c3] py-1.5 hover:text-white transition-colors">Careers</a>
            <a href="#" className="block text-[#a9b1c3] py-1.5 hover:text-white transition-colors">Press</a>
          </div>
          <div>
            <h4 className="mb-2.5 text-lg font-semibold">Support</h4>
            <a href="#" className="block text-[#a9b1c3] py-1.5 hover:text-white transition-colors">Help Center</a>
            <a href="#" className="block text-[#a9b1c3] py-1.5 hover:text-white transition-colors">Cancellation Options</a>
            <Link to='/contact' className="block text-[#a9b1c3] py-1.5 hover:text-white transition-colors">Contact</Link>
          </div>
        </div>
        <p className="text-[#a9b1c3] mt-4">© 2025 Ghumakkad. All rights reserved.</p>
      </footer>

      {showBackToTop && (
        <div
          onClick={scrollToTop}
          className="fixed right-4 bottom-4 w-11 h-11 rounded-full grid place-items-center bg-linear-to-br from-violet-600 to-cyan-500 text-white shadow-[0_10px_30px_rgba(0,0,0,0.35)] cursor-pointer z-800 animate-fadeInUp"
        >
          ↑
        </div>
      )}

  
      <div
        className="fixed w-[200px] h-[200px] rounded-full pointer-events-none mix-blend-screen z-0"
        style={{
          background: 'radial-gradient(closest-side, rgba(124,58,237,0.18), transparent 70%)',
          transform: `translate(${cursorPos.x}px, ${cursorPos.y}px)`
        }}
      />

      <style jsx>{`
        @keyframes heroZoom {
          0% { 
            transform: scale(1.05);
          }
          100% { 
            transform: scale(1.15);
          }
        }
        
        .hero-slide {
          animation: heroZoom 15s ease-in-out infinite alternate;
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fadeInUp {
          animation: fadeInUp 0.25s ease-out;
        }
        
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}