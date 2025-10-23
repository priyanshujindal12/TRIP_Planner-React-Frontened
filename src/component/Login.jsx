import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const navigate = useNavigate();
  const [isSignupMode, setIsSignupMode] = useState(false);
  const [showMessage, setShowMessage] = useState(null);
  
  // Form states
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [signupData, setSignupData] = useState({ email: '', password: '' });
  
  // Error states
  const [loginErrors, setLoginErrors] = useState({ email: [], password: [] });
  const [signupErrors, setSignupErrors] = useState({ email: [], password: [] });
  
  // Loading states
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [isSignupLoading, setIsSignupLoading] = useState(false);

  // Validation rules
  const validationRules = {
    email: {
      minLength: 3,
      maxLength: 100,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    },
    password: {
      minLength: 5,
      maxLength: 67,
      pattern: /[a-z]/
    }
  };

  // Validation functions
  const validateEmail = (email) => {
    const errors = [];
    if (!email) {
      errors.push('Email is required');
    } else {
      if (email.length < validationRules.email.minLength) {
        errors.push(`Email must be at least ${validationRules.email.minLength} characters`);
      }
      if (email.length > validationRules.email.maxLength) {
        errors.push(`Email must be no more than ${validationRules.email.maxLength} characters`);
      }
      if (!validationRules.email.pattern.test(email)) {
        errors.push('Please enter a valid email address');
      }
    }
    return errors;
  };

  const validatePassword = (password, isSignup = false) => {
    const errors = [];
    if (!password) {
      errors.push('Password is required');
    } else {
      if (password.length < validationRules.password.minLength) {
        errors.push(`Password must be at least ${validationRules.password.minLength} characters`);
      }
      if (password.length > validationRules.password.maxLength) {
        errors.push(`Password must be no more than ${validationRules.password.maxLength} characters`);
      }
      if (isSignup && !validationRules.password.pattern.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
      }
    }
    return errors;
  };

  
  const toggleAuthMode = (showSignup) => {
    setIsSignupMode(showSignup);
    setLoginErrors({ email: [], password: [] });
    setSignupErrors({ email: [], password: [] });
  };


  const displayMessage = (message, type = 'info') => {
    setShowMessage({ message, type });
    setTimeout(() => setShowMessage(null), 5000);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    
    const emailErrors = validateEmail(loginData.email);
    const passwordErrors = validatePassword(loginData.password);
    
    setLoginErrors({ email: emailErrors, password: passwordErrors });
    
    if (emailErrors.length > 0 || passwordErrors.length > 0) {
      displayMessage('Please fix the validation errors above', 'error');
      return;
    }

    setIsLoginLoading(true);

    try {
      const res = await fetch("https://trip-planner-backend-y5v9.onrender.com/user/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginData)
      });
      const result = await res.json();

      if (res.ok && result.token) {
        localStorage.setItem("token", result.token);
        localStorage.setItem("userEmail", loginData.email);
        displayMessage('Login successful! Redirecting...', 'success');
        setTimeout(() => navigate('/dashboard'), 1000);
      } else {
        displayMessage(result.msg || 'Login failed. Please check your credentials.', 'error');
      }
    } catch (error) {
      console.error('Login error:', error);
      displayMessage('Network error. Please try again.', 'error');
    } finally {
      setIsLoginLoading(false);
    }
  };


  const handleSignup = async (e) => {
    e.preventDefault();
    
    const emailErrors = validateEmail(signupData.email);
    const passwordErrors = validatePassword(signupData.password, true);
    
    setSignupErrors({ email: emailErrors, password: passwordErrors });
    
    if (emailErrors.length > 0 || passwordErrors.length > 0) {
      displayMessage('Please fix the validation errors above', 'error');
      return;
    }

    setIsSignupLoading(true);

    try {
      const res = await fetch("https://trip-planner-backend-y5v9.onrender.com/user/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(signupData)
      });
      const result = await res.json();

      if (res.ok) {
        displayMessage(result.msg || 'Account created successfully!', 'success');
        setSignupData({ email: '', password: '' });
        setSignupErrors({ email: [], password: [] });
        setTimeout(() => toggleAuthMode(false), 1500);
      } else {
        displayMessage(result.msg || 'Signup failed. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Signup error:', error);
      displayMessage('Network error. Please try again.', 'error');
    } finally {
      setIsSignupLoading(false);
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden relative font-['Inter']">
      {/* Hero Background */}
      <div 
        className="fixed top-0 left-0 w-full h-screen bg-cover bg-center -z-10"
        style={{
          background: `linear-gradient(135deg, rgba(111, 184, 208, 0.6), rgba(159, 227, 241, 0.4)), url('https://images.unsplash.com/photo-1506905925346-21bda4d32df4?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />

   
      <header className="fixed top-0 left-0 right-0 z-50 p-4 sm:p-6 lg:p-8 flex justify-between items-center">
        <button
          onClick={() => navigate('/')}
          className="font-['Outfit'] text-xl sm:text-2xl lg:text-3xl font-bold text-white transition-transform hover:scale-105"
          style={{ textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)' }}
        >
          Ghumakkad
        </button>
      </header>

   
      <main className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 pt-24 sm:pt-28 lg:pt-32 pb-8">
        <div className="w-full max-w-[1200px] grid lg:grid-cols-[1fr_400px] gap-8 lg:gap-16 items-center">
          
       
          <section 
            className="opacity-0 order-2 lg:order-1 text-center lg:text-left"
            style={{ animation: 'fadeInUp 1s ease 0.3s forwards' }}
          >
            <h1 
              className="font-['Outfit'] text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-white leading-tight mb-4 lg:mb-6"
              style={{ textShadow: '0 4px 8px rgba(0, 0, 0, 0.3)' }}
            >
              Discover Your Next Adventure
            </h1>
            <p 
              className="text-lg sm:text-xl text-white/90 mb-8 lg:mb-12 leading-relaxed"
              style={{ textShadow: '0 2px 4px rgba(0, 0, 0, 0.2)' }}
            >
              Journey beyond the ordinary and create memories that last a lifetime
            </p>
            <div className="flex gap-3 sm:gap-4 flex-wrap justify-center lg:justify-start">
              <div 
                className="w-20 h-14 sm:w-28 sm:h-20 lg:w-32 lg:h-24 rounded-xl overflow-hidden shadow-2xl transform -rotate-2 hover:rotate-0 hover:scale-105 transition-transform duration-300"
              >
                <img 
                  src="https://images.unsplash.com/photo-1544735716-392fe2489ffa?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" 
                  alt="Mountain landscape"
                  className="w-full h-full object-cover"
                />
              </div>
              <div 
                className="w-20 h-14 sm:w-28 sm:h-20 lg:w-32 lg:h-24 rounded-xl overflow-hidden shadow-2xl transform rotate-2 mt-2 sm:mt-4 hover:rotate-0 hover:scale-105 transition-transform duration-300"
              >
                <img 
                  src="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80" 
                  alt="Ocean view"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </section>

          <div 
            className="bg-white/15 backdrop-blur-xl border border-white/20 rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-12 shadow-2xl opacity-0 order-1 lg:order-2 w-full max-w-[450px] mx-auto"
            style={{ animation: 'fadeInUp 1s ease 0.6s forwards' }}
          >
          
            <div className="relative bg-white/10 rounded-xl p-1 mb-6 sm:mb-8 overflow-hidden">
              <div 
                className={`absolute top-1 left-1 w-[calc(50%-4px)] h-[calc(100%-8px)] bg-white rounded-lg transition-transform duration-300 ease-in-out ${
                  isSignupMode ? 'translate-x-full' : 'translate-x-0'
                }`}
              />
              <button
                type="button"
                onClick={() => toggleAuthMode(false)}
                className={`relative z-10 flex-1 w-1/2 py-3 text-center font-semibold rounded-lg transition-colors duration-300 ${
                  !isSignupMode ? 'text-[#0f1f26]' : 'text-white'
                }`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => toggleAuthMode(true)}
                className={`relative z-10 flex-1 w-1/2 py-3 text-center font-semibold rounded-lg transition-colors duration-300 ${
                  isSignupMode ? 'text-[#0f1f26]' : 'text-white'
                }`}
              >
                Sign Up
              </button>
            </div>

         
            <div className="relative min-h-[280px] sm:min-h-[300px] overflow-hidden">
         
              <div
                className={`absolute top-0 left-0 w-full transition-all duration-400 ease-in-out ${
                  isSignupMode ? '-translate-x-full opacity-0' : 'translate-x-0 opacity-100'
                }`}
              >
                <form onSubmit={handleLogin}>
                  <div className="mb-5 sm:mb-6">
                    <label className="block text-white font-medium mb-2 text-sm">Email</label>
                    <input
                      type="email"
                      value={loginData.email}
                      onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                      onBlur={() => setLoginErrors({ ...loginErrors, email: validateEmail(loginData.email) })}
                      onFocus={() => setLoginErrors({ ...loginErrors, email: [] })}
                      className={`w-full px-4 sm:px-5 py-3 sm:py-4 bg-white/10 border ${
                        loginErrors.email.length > 0 ? 'border-red-500' : 'border-white/20'
                      } rounded-xl text-white placeholder-white/60 focus:outline-none focus:border-[#6fb8d0] focus:bg-white/15 focus:-translate-y-0.5 focus:shadow-lg transition-all duration-300 text-base`}
                      placeholder="Enter your email"
                      required
                    />
                    {loginErrors.email.length > 0 && (
                      <span className="text-red-400 text-sm mt-2 block">{loginErrors.email[0]}</span>
                    )}
                  </div>
                  <div className="mb-5 sm:mb-6">
                    <label className="block text-white font-medium mb-2 text-sm">Password</label>
                    <input
                      type="password"
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      onBlur={() => setLoginErrors({ ...loginErrors, password: validatePassword(loginData.password) })}
                      onFocus={() => setLoginErrors({ ...loginErrors, password: [] })}
                      className={`w-full px-4 sm:px-5 py-3 sm:py-4 bg-white/10 border ${
                        loginErrors.password.length > 0 ? 'border-red-500' : 'border-white/20'
                      } rounded-xl text-white placeholder-white/60 focus:outline-none focus:border-[#6fb8d0] focus:bg-white/15 focus:-translate-y-0.5 focus:shadow-lg transition-all duration-300 text-base`}
                      placeholder="Enter your password"
                      required
                    />
                    {loginErrors.password.length > 0 && (
                      <span className="text-red-400 text-sm mt-2 block">{loginErrors.password[0]}</span>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={isLoginLoading}
                    className="w-full py-3 sm:py-4 bg-gradient-to-br from-[#6fb8d0] to-[#9fe3f1] text-white font-semibold rounded-xl hover:-translate-y-0.5 hover:shadow-xl transition-all duration-300 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
                  >
                    {isLoginLoading ? 'Signing In...' : 'Sign In'}
                  </button>
                </form>
              </div>

    
              <div
                className={`absolute top-0 left-0 w-full transition-all duration-400 ease-in-out ${
                  isSignupMode ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
                }`}
              >
                <form onSubmit={handleSignup}>
                  <div className="mb-5 sm:mb-6">
                    <label className="block text-white font-medium mb-2 text-sm">Email</label>
                    <input
                      type="email"
                      value={signupData.email}
                      onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                      onBlur={() => setSignupErrors({ ...signupErrors, email: validateEmail(signupData.email) })}
                      onFocus={() => setSignupErrors({ ...signupErrors, email: [] })}
                      className={`w-full px-4 sm:px-5 py-3 sm:py-4 bg-white/10 border ${
                        signupErrors.email.length > 0 ? 'border-red-500' : 'border-white/20'
                      } rounded-xl text-white placeholder-white/60 focus:outline-none focus:border-[#6fb8d0] focus:bg-white/15 focus:-translate-y-0.5 focus:shadow-lg transition-all duration-300 text-base`}
                      placeholder="Enter your email"
                      required
                    />
                    {signupErrors.email.length > 0 && (
                      <span className="text-red-400 text-sm mt-2 block">{signupErrors.email[0]}</span>
                    )}
                  </div>
                  <div className="mb-5 sm:mb-6">
                    <label className="block text-white font-medium mb-2 text-sm">Password</label>
                    <input
                      type="password"
                      value={signupData.password}
                      onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                      onBlur={() => setSignupErrors({ ...signupErrors, password: validatePassword(signupData.password, true) })}
                      onFocus={() => setSignupErrors({ ...signupErrors, password: [] })}
                      className={`w-full px-4 sm:px-5 py-3 sm:py-4 bg-white/10 border ${
                        signupErrors.password.length > 0 ? 'border-red-500' : 'border-white/20'
                      } rounded-xl text-white placeholder-white/60 focus:outline-none focus:border-[#6fb8d0] focus:bg-white/15 focus:-translate-y-0.5 focus:shadow-lg transition-all duration-300 text-base`}
                      placeholder="Create a password"
                      required
                    />
                    {signupErrors.password.length > 0 && (
                      <span className="text-red-400 text-sm mt-2 block">{signupErrors.password[0]}</span>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={isSignupLoading}
                    className="w-full py-3 sm:py-4 bg-gradient-to-br from-[#6fb8d0] to-[#9fe3f1] text-white font-semibold rounded-xl hover:-translate-y-0.5 hover:shadow-xl transition-all duration-300 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
                  >
                    {isSignupLoading ? 'Creating Account...' : 'Create Account'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </main>

    
      {showMessage && (
        <div
          className={`fixed top-5 right-5 px-6 py-4 rounded-lg shadow-2xl z-[10000] max-w-[400px] animate-slideIn ${
            showMessage.type === 'success'
              ? 'bg-green-500'
              : showMessage.type === 'error'
              ? 'bg-red-500'
              : 'bg-blue-500'
          } text-white font-medium`}
        >
          {showMessage.message}
        </div>
      )}

     
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

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

        .animate-slideIn {
          animation: slideIn 0.3s ease;
        }

        /* Responsive adjustments */
        @media (max-width: 1024px) {
          .grid {
            grid-template-columns: 1fr;
          }
        }

        /* Touch device optimizations */
        @media (hover: none) and (pointer: coarse) {
          input {
            font-size: 16px !important;
          }
        }

        /* Landscape mobile */
        @media (max-height: 500px) and (orientation: landscape) {
          .min-h-screen {
            padding-top: 4rem;
            padding-bottom: 1rem;
          }
        }
      `}</style>
    </div>
  );
};

export default Login;