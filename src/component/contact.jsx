import { useState, useEffect } from 'react';
import {  Link } from 'react-router-dom';
import emailjs from '@emailjs/browser';

const Contact = () => {

  const [showMessage, setShowMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [navScrolled, setNavScrolled] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  
  
  const [errors, setErrors] = useState({});


  const EMAILJS_CONFIG = {
    PUBLIC_KEY: import.meta.env.EMAILJS_PUBLIC_KEY,
    SERVICE_ID: import.meta.env.EMAILJS_SERVICE_ID,
    TEMPLATE_ID: import.meta.env.EMAILJS_TEMPLATE_ID
  };


  const validationRules = {
    name: { required: true, minLength: 2, maxLength: 50, pattern: /^[a-zA-Z\s]+$/ },
    email: { required: true, minLength: 3, maxLength: 100, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    phone: { required: false, pattern: /^[+]?[-0-9\s()]{10,15}$/ },
    subject: { required: true },
    message: { required: true, minLength: 10, maxLength: 1000 }
  };


  useEffect(() => {
    if (EMAILJS_CONFIG.PUBLIC_KEY && EMAILJS_CONFIG.PUBLIC_KEY !== 'YOUR_PUBLIC_KEY_HERE') {
      emailjs.init(EMAILJS_CONFIG.PUBLIC_KEY);
    }
  }, []);


  useEffect(() => {
    const handleScroll = () => {
      setNavScrolled(window.scrollY > 60);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

 
  const validateField = (fieldName, value) => {
    const rules = validationRules[fieldName];
    if (!rules) return null;

    const trimmedValue = value.trim();

    if (rules.required && !trimmedValue) return 'This field is required';
    if (!trimmedValue && !rules.required) return null;
    if (rules.minLength && trimmedValue.length < rules.minLength) 
      return `Minimum ${rules.minLength} characters required`;
    if (rules.maxLength && trimmedValue.length > rules.maxLength) 
      return `Maximum ${rules.maxLength} characters allowed`;
    if (rules.pattern && !rules.pattern.test(trimmedValue)) {
      if (fieldName === 'email') return 'Please enter a valid email address';
      if (fieldName === 'phone') return 'Please enter a valid phone number';
      if (fieldName === 'name') return 'Name can only contain letters and spaces';
      return 'Invalid format';
    }
    return null;
  };

  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  // Handle blur validation
  const handleBlur = (e) => {
    const { name, value } = e.target;
    const error = validateField(name, value);
    if (error) setErrors(prev => ({ ...prev, [name]: error }));
  };

  // Display message
  const displayMessage = (message, type = 'info') => {
    setShowMessage({ message, type });
    setTimeout(() => setShowMessage(null), 5000);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    Object.keys(formData).forEach(fieldName => {
      const error = validateField(fieldName, formData[fieldName]);
      if (error) newErrors[fieldName] = error;
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      displayMessage('Please fix the errors in the form.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const templateParams = {
        from_name: formData.name,
        from_email: formData.email,
        from_phone: formData.phone || 'Not provided',
        subject: formData.subject,
        message: formData.message
      };

      if (EMAILJS_CONFIG.PUBLIC_KEY === 'YOUR_PUBLIC_KEY_HERE') {
        throw new Error('EmailJS not configured.');
      }

      const response = await emailjs.send(
        EMAILJS_CONFIG.SERVICE_ID,
        EMAILJS_CONFIG.TEMPLATE_ID,
        templateParams
      );

      if (response.status === 200) {
        displayMessage("Message sent successfully! We'll get back to you soon.", 'success');
        setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
        setErrors({});
      } else {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      console.error('Error:', error);
      displayMessage('Failed to send message. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1220] text-white font-['Poppins',system-ui,sans-serif] overflow-x-hidden">
  
      <nav className={`fixed top-0 left-0 w-full flex items-center justify-between gap-3 px-[4vw] py-3.5 z-900 transition-all duration-300 ${navScrolled ? 'backdrop-blur-xl bg-[rgba(10,12,22,0.55)] shadow-[0_10px_30px_rgba(0,0,0,0.35)]' : ''}`}>
        <div className="flex items-center gap-3 font-extrabold tracking-wide">
          <div  className="text-3xl w-9 h-9 grid place-items-center rounded-xl bg-linear-to-br from-violet-600 to-cyan-500 shadow-[0_6px_16px_rgba(124,58,237,0.45)]">
            <Link to="/">✈</Link>
            
        
          </div>
          Ghumakkad
        </div>
        
        <ul className="hidden lg:flex list-none gap-8 m-0 p-0">
          <li><Link to="/" className="opacity-90 font-medium hover:opacity-100 hover:underline">Home</Link></li>
          <li><Link to='/contact' className="opacity-90 font-medium hover:opacity-100 hover:underline">Contact</Link></li>
          <li><Link to='/login' className="px-6 py-2.5 rounded-full bg-blueviolet text-white shadow-[0_10px_24px_rgba(124,58,237,0.35)] hover:scale-105 transition-transform">Join a Trip</Link></li>
        </ul>

        <div className="lg:hidden cursor-pointer bg-[rgba(255,255,255,0.06)] px-3.5 py-2.5 rounded-xl text-xl">
          ☰
        </div>
      </nav>

      <header className="min-h-screen relative flex items-center px-[6vw] pt-[18vh] pb-[10vh] overflow-hidden">
     
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-900/30 via-blue-900/20 to-cyan-900/30"></div>
          
      
          <div className="absolute inset-0 opacity-20">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <defs>
                <pattern id="worldmap" width="100" height="100" patternUnits="userSpaceOnUse">
                  <path d="M10 10 Q50 90 90 10 Q50 30 10 90" stroke="rgba(124,58,237,0.3)" strokeWidth="0.5" fill="none">
                    <animate attributeName="opacity" values="0.3;0.8;0.3" dur="4s" repeatCount="indefinite"/>
                  </path>
                  <path d="M20 80 Q60 20 80 50" stroke="rgba(6,182,212,0.3)" strokeWidth="0.5" fill="none">
                    <animate attributeName="opacity" values="0.3;0.8;0.3" dur="3s" repeatCount="indefinite" begin="1s"/>
                  </path>
                </pattern>
              </defs>
              <rect width="100" height="100" fill="url(#worldmap)"/>
            </svg>
          </div>

         
          {[
            { left: '10%', top: '15%', delay: '0s', duration: '8s', size: '1.2rem' },
            { left: '25%', top: '70%', delay: '1s', duration: '10s', size: '1.5rem' },
            { left: '45%', top: '25%', delay: '2s', duration: '7s', size: '1.0rem' },
            { left: '65%', top: '60%', delay: '3s', duration: '9s', size: '1.3rem' },
            { left: '80%', top: '40%', delay: '4s', duration: '11s', size: '1.1rem' },
            { left: '90%', top: '85%', delay: '5s', duration: '8s', size: '1.4rem' }
          ].map((pos, i) => (
            <div
              key={i}
              className="absolute rotating-plane"
              style={{
                left: pos.left,
                top: pos.top,
                animationDelay: pos.delay,
                animationDuration: pos.duration,
                fontSize: pos.size
              }}
            >
              ✈️
            </div>
          ))}
        </div>

        <div className="relative z-10 w-full">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Hero Text */}
              <div className="space-y-6">
                <h1 className="text-4xl md:text-5xl lg:text-6xl leading-tight text-white [text-shadow:2px_2px_8px_rgba(0,0,0,0.7)]">
                  Get In Touch
                </h1>
                <p className="text-[#a9b1c3] text-lg leading-relaxed max-w-lg">
                  Ready for your next adventure? Our team is here to help you plan, join, or customize your perfect trip!
                </p>
                <div className="flex flex-wrap gap-3">
                  <span className="px-4 py-2 rounded-full bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.12)] text-sm text-[#e6f7ff]">24/7 Support</span>
                  <span className="px-4 py-2 rounded-full bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.12)] text-sm text-[#e6f7ff]">Expert Team</span>
                  <span className="px-4 py-2 rounded-full bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.12)] text-sm text-[#e6f7ff]">100% Secure</span>
                </div>
              </div>

              {/* CONTACT FORM */}
              <div className="bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] rounded-[22px] p-8 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-[#a9b1c3]">👤 Full Name *</label>
                      <input type="text" name="name" value={formData.name} onChange={handleInputChange} onBlur={handleBlur}
                        className={`w-full px-4 py-3 rounded-xl bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.12)] text-white placeholder-[#a9b1c3] focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20 transition-all ${errors.name ? 'border-red-500 bg-red-500/10' : ''}`}
                        placeholder="Your name" />
                      {errors.name && <span className="text-red-400 text-sm">{errors.name}</span>}
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-[#a9b1c3]">📧 Email *</label>
                      <input type="email" name="email" value={formData.email} onChange={handleInputChange} onBlur={handleBlur}
                        className={`w-full px-4 py-3 rounded-xl bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.12)] text-white placeholder-[#a9b1c3] focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20 transition-all ${errors.email ? 'border-red-500 bg-red-500/10' : ''}`}
                        placeholder="your@email.com" />
                      {errors.email && <span className="text-red-400 text-sm">{errors.email}</span>}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-[#a9b1c3]">📱 Phone</label>
                      <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} onBlur={handleBlur}
                        className={`w-full px-4 py-3 rounded-xl bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.12)] text-white placeholder-[#a9b1c3] focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20 transition-all ${errors.phone ? 'border-red-500 bg-red-500/10' : ''}`}
                        placeholder="+91 123 456 7890" />
                      {errors.phone && <span className="text-red-400 text-sm">{errors.phone}</span>}
                    </div>
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-[#a9b1c3]">🎯 Subject *</label>
                      <select name="subject" value={formData.subject} onChange={handleInputChange} onBlur={handleBlur}
                        className={`w-full px-4 py-3 rounded-xl bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.12)] text-white focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20 transition-all ${errors.subject ? 'border-red-500 bg-red-500/10' : ''}`}>
                        <option value="">Select subject</option>
                        <option value="Trip Planning">Trip Planning</option>
                        <option value="Join a Trip">Join a Trip</option>
                        <option value="Technical Support">Technical Support</option>
                        <option value="Partnership">Partnership</option>
                        <option value="Feedback">Feedback</option>
                      </select>
                      {errors.subject && <span className="text-red-400 text-sm">{errors.subject}</span>}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-[#a9b1c3]">💭 Message *</label>
                    <textarea name="message" value={formData.message} onChange={handleInputChange} onBlur={handleBlur} rows="4"
                      className={`w-full px-4 py-3 rounded-xl bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.12)] text-white placeholder-[#a9b1c3] focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/20 transition-all resize-none ${errors.message ? 'border-red-500 bg-red-500/10' : ''}`}
                      placeholder="Tell us about your travel plans..." />
                    {errors.message && <span className="text-red-400 text-sm">{errors.message}</span>}
                  </div>
                  <button type="submit" disabled={isLoading}
                    className="w-full py-4 rounded-xl bg-linear-to-br from-violet-600 to-cyan-500 text-white font-semibold shadow-[0_10px_30px_rgba(124,58,237,0.35)] hover:translate-y-[-2px] hover:saturate-120 transition-all duration-250 disabled:opacity-50 flex items-center justify-center gap-2">
                    {isLoading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Sending...
                      </>
                    ) : (
                      <>
                        ✈️ Send Message
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </header>

   
      <section className="py-20 px-[6vw] bg-[rgba(255,255,255,0.02)]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16 text-white">What We Can Do For You</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: '🗺️', title: 'Custom Trip Planning', desc: 'Personalized itineraries based on your interests, budget & timeline' },
              { icon: '🤝', title: 'Group Matching', desc: 'Connect with like-minded travelers for safe, fun group trips' },
              { icon: '📅', title: '24/7 Support', desc: 'Round-the-clock assistance during planning & throughout your journey' },
              { icon: '💰', title: 'Budget Optimization', desc: 'Best deals on flights, stays & activities - save up to 30%' },
              { icon: '🛡️', title: 'Safety First', desc: 'Verified travelers, emergency support & real-time tracking' },
              { icon: '🌟', title: 'Exclusive Experiences', desc: 'Hidden gems, local guides & offbeat destinations you won\'t find elsewhere' }
            ].map((service, i) => (
              <div key={i} className="group bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.1)] rounded-[22px] p-8 text-center backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.35)] hover:translate-y-[-8px] transition-all duration-300">
                <div className="text-4xl mb-4">{service.icon}</div>
                <h3 className="text-xl font-semibold mb-3 text-white">{service.title}</h3>
                <p className="text-[#a9b1c3] leading-relaxed">{service.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACT INFO */}
      <section className="py-20 px-[6vw] bg-[rgba(255,255,255,0.02)]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-8 text-white">Quick Contact</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: '✉️', title: 'Email Us', detail: 'hello@ghumakkad.com', subtitle: 'Response in 2 hours' },
              { icon: '📞', title: 'Call Us', detail: '+91 800 123 4567', subtitle: 'Mon-Sat, 9AM-8PM' },
              { icon: '💬', title: 'Live Chat', detail: 'Chat Now', subtitle: 'Instant Support' }
            ].map((item, i) => (
              <div key={i} className="space-y-3">
                <div className="text-4xl">{item.icon}</div>
                <h3 className="font-semibold">{item.title}</h3>
                <p className="text-white font-medium">{item.detail}</p>
                <p className="text-[#a9b1c3] text-sm">{item.subtitle}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SIMPLIFIED FOOTER */}
      <footer className="py-12 px-[6vw] border-t border-[rgba(255,255,255,0.06)] bg-[rgba(0,0,0,0.35)]">
        <div className="text-center">
          <h4 className="mb-4 text-xl font-semibold">Ghumakkad</h4>
          <p className="text-[#a9b1c3] mb-6 max-w-md mx-auto">Your trusted travel companion for safe, fun, and unforgettable adventures.</p>
          <div className="flex justify-center gap-6 mb-6">
            <a href="#" className="text-xl text-[#a9b1c3] hover:text-cyan-500 transition-colors">📘</a>
            <a href="#" className="text-xl text-[#a9b1c3] hover:text-cyan-500 transition-colors">🐦</a>
            <a href="#" className="text-xl text-[#a9b1c3] hover:text-cyan-500 transition-colors">📷</a>
          </div>
          <p className="text-[#a9b1c3] text-sm">© 2025 Ghumakkad. All rights reserved.</p>
        </div>
      </footer>

      {/* TOAST NOTIFICATION */}
      {showMessage && (
        <div className={`fixed top-20 right-4 z-1000 p-4 rounded-2xl shadow-2xl max-w-sm ${
          showMessage.type === 'success' ? 'bg-green-600/90 backdrop-blur-xl' : 
          showMessage.type === 'error' ? 'bg-red-600/90 backdrop-blur-xl' : 'bg-violet-600/90 backdrop-blur-xl'
        } border border-white/10 animate-bounceIn`}>
          <div className="flex items-center gap-3">
            {showMessage.type === 'success' ? '✅' : showMessage.type === 'error' ? '❌' : 'ℹ️'}
            <span className="font-medium">{showMessage.message}</span>
          </div>
        </div>
      )}

      {/* ANIMATIONS */}
      <style jsx>{`
        @keyframes bounceIn {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.05); }
          70% { transform: scale(0.9); }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes rotatePlane {
          0% { transform: rotate(0deg) translateY(0px); }
          25% { transform: rotate(90deg) translateY(-15px); }
          50% { transform: rotate(180deg) translateY(0px); }
          75% { transform: rotate(270deg) translateY(-15px); }
          100% { transform: rotate(360deg) translateY(0px); }
        }
        .animate-bounceIn { animation: bounceIn 0.6s ease-out; }
        .animate-spin { animation: spin 1s linear infinite; }
        .rotating-plane { 
          animation: rotatePlane 8s linear infinite;
          opacity: 0.8;
        }
      `}</style>
    </div>
  );
};

export default Contact;