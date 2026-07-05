import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  signOut
} from 'firebase/auth';
import { getClientAuth } from '../lib/firebase';
import { useToast } from '../components/Toast';
import { Loader } from '../components/Loader';
import { useAuth } from '../contexts/AuthContext';
import { 
  TrendingUp, 
  Mail, 
  Lock, 
  User, 
  Phone, 
  ShieldCheck, 
  Terminal, 
  ArrowLeft, 
  CheckCircle, 
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import api from '../lib/api';

// Validation Schemas using Zod
const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean(),
});

const signupSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
  phone: z.string().min(5, 'Please enter a valid phone number'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type SignupFormValues = z.infer<typeof signupSchema>;
type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

const getFriendlyErrorMessage = (err: any): string => {
  const code = err?.code || '';
  const message = err?.message || '';

  if (code === 'auth/invalid-login-credentials' || code === 'auth/invalid-credential' || code === 'auth/user-not-found' || code === 'auth/wrong-password') {
    return 'Invalid email or password. Please double check your credentials.';
  }
  if (code === 'auth/email-already-in-use') {
    return 'This email address is already registered. Please sign in instead.';
  }
  if (code === 'auth/weak-password') {
    return 'The password is too weak. Please use at least 6 characters.';
  }
  if (code === 'auth/operation-not-allowed') {
    return 'Email/Password sign-in is not enabled. Please contact SMM support.';
  }
  if (code === 'auth/configuration-not-found') {
    return 'Firebase authentication configuration is missing or not found.';
  }
  if (code === 'auth/invalid-api-key') {
    return 'The configured Firebase API key is invalid or unauthorized.';
  }
  if (code === 'auth/network-request-failed') {
    return 'Network connection failed. Please check your internet connection.';
  }
  if (code === 'auth/internal-error') {
    return 'An internal authentication error occurred. Please try again.';
  }
  if (code === 'permission-denied' || code === 'missing-or-insufficient-permissions' || message.includes('permission-denied') || message.includes('permissions')) {
    return 'Access Denied: You do not have sufficient permissions to perform this action.';
  }

  return message || 'An unexpected error occurred. Please try again.';
};

export function Auth() {
  const { currentUser, refreshProfile } = useAuth();
  const [authView, setAuthView] = useState<'login' | 'register' | 'forgot-password'>('login');
  const [isLoading, setIsLoading] = useState(false);
  const { success, error } = useToast();

  // React Hook Form setups
  const { 
    register: registerLogin, 
    handleSubmit: handleLoginSubmit, 
    formState: { errors: loginErrors } 
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { rememberMe: true }
  });

  const { 
    register: registerSignup, 
    handleSubmit: handleSignupSubmit, 
    formState: { errors: signupErrors } 
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema)
  });

  const { 
    register: registerForgot, 
    handleSubmit: handleForgotSubmit, 
    formState: { errors: forgotErrors } 
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema)
  });

  // Login Handler
  const onLogin = async (data: LoginFormValues) => {
    setIsLoading(true);
    try {
      const auth = getClientAuth();
      
      // Enforce remember me persistence
      await setPersistence(
        auth, 
        data.rememberMe ? browserLocalPersistence : browserSessionPersistence
      );

      const userCredential = await signInWithEmailAndPassword(auth, data.email, data.password);
      success('Welcome back', `Signed in successfully as ${userCredential.user.email}`);
      await refreshProfile();
    } catch (err: any) {
      console.error('Login error', err);
      error('Sign In Failed', getFriendlyErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  // Signup Handler
  const onSignup = async (data: SignupFormValues) => {
    setIsLoading(true);
    try {
      const auth = getClientAuth();
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      
      // Update display name in Firebase Auth profile
      await updateProfile(userCredential.user, {
        displayName: data.fullName,
      });

      // Provision user profile on backend server
      try {
        await api.post('/users', {
          name: data.fullName,
          phone: data.phone,
        });
      } catch (backendErr) {
        console.warn('Backend profile provisioning skipped/failed:', backendErr);
      }

      success('Account Created', 'Your SMM account has been successfully created!');
      await refreshProfile();
    } catch (err: any) {
      console.error('Registration error', err);
      error('Registration Failed', getFriendlyErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  // Forgot Password Handler
  const onForgotPassword = async (data: ForgotPasswordFormValues) => {
    setIsLoading(true);
    try {
      const auth = getClientAuth();
      await sendPasswordResetEmail(auth, data.email);
      success('Reset Email Sent', 'If the email exists, a password reset link has been sent.');
      setAuthView('login');
    } catch (err: any) {
      console.error('Forgot password error', err);
      error('Reset Failed', getFriendlyErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const isUnverified = false;

  return (
    <div className="min-h-screen bg-[#05070B] flex items-center justify-center p-6 font-sans relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-600/5 rounded-full blur-3xl" />

      {isLoading && (
        <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center">
          <Loader size="lg" />
        </div>
      )}

      <div className="max-w-md w-full relative z-10 animate-fade-in">
        {/* Brand Identity */}
        <div className="text-center mb-8">
          <div className="inline-flex w-14 h-14 rounded-xl bg-blue-600/10 border border-blue-500/30 items-center justify-center shadow-[0_0_25px_rgba(37,99,235,0.25)] mb-4">
            <TrendingUp className="w-7 h-7 text-blue-400 animate-pulse" />
          </div>
          <h1 className="font-display font-bold text-3xl tracking-tight text-white">
            ZENIT <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">SMM PANEL</span>
          </h1>
          <p className="text-gray-400 text-xs mt-1 tracking-widest uppercase font-mono">
            Premium Social Media Marketing Core
          </p>
        </div>

        {/* Auth Card */}
        <div className="bg-[#0A0D15]/80 border border-blue-900/20 rounded-2xl p-8 backdrop-blur-md shadow-[0_0_50px_rgba(0,102,255,0.05)]">
          
          {authView === 'forgot-password' ? (
            /* Forgot Password Form */
            <div className="space-y-4">
              <button
                id="btn-back-to-login"
                onClick={() => setAuthView('login')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-blue-400 transition-colors cursor-pointer mb-2"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Sign In
              </button>
              
              <div>
                <h3 className="text-lg font-bold text-white mb-1">Forgot Password?</h3>
                <p className="text-gray-400 text-xs">Enter your email and we'll send you a password reset link.</p>
              </div>

              <form onSubmit={handleForgotSubmit(onForgotPassword)} className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-500" />
                    <input
                      id="forgot-email-input"
                      type="email"
                      {...registerForgot('email')}
                      placeholder="you@example.com"
                      className="w-full pl-11 pr-4 py-3 bg-[#06080E] border border-blue-900/15 rounded-xl text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
                    />
                  </div>
                  {forgotErrors.email && (
                    <p className="text-xs text-rose-500 mt-1">{forgotErrors.email.message}</p>
                  )}
                </div>

                <button
                  id="forgot-submit-btn"
                  type="submit"
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 rounded-xl text-sm font-semibold tracking-wide shadow-[0_0_20px_rgba(37,99,235,0.25)] transition-all cursor-pointer"
                >
                  Send Reset Link
                </button>
              </form>
            </div>
          ) : (
            /* Main Sign In / Sign Up View */
            <>
              <div className="flex gap-4 border-b border-blue-900/15 pb-4 mb-6">
                <button
                  id="auth-toggle-login"
                  onClick={() => setAuthView('login')}
                  className={`flex-1 text-center pb-2 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
                    authView === 'login' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-300'
                  }`}
                >
                  Sign In
                </button>
                <button
                  id="auth-toggle-signup"
                  onClick={() => setAuthView('register')}
                  className={`flex-1 text-center pb-2 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
                    authView === 'register' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-300'
                  }`}
                >
                  Create Account
                </button>
              </div>

              {authView === 'login' ? (
                /* Login Form */
                <form onSubmit={handleLoginSubmit(onLogin)} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-500" />
                      <input
                        id="login-email-input"
                        type="email"
                        {...registerLogin('email')}
                        placeholder="Enter your email"
                        className="w-full pl-11 pr-4 py-3 bg-[#06080E] border border-blue-900/15 rounded-xl text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                    {loginErrors.email && (
                      <p className="text-xs text-rose-500 mt-1">{loginErrors.email.message}</p>
                    )}
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        Password
                      </label>
                      <button
                        id="btn-forgot-password-link"
                        type="button"
                        onClick={() => setAuthView('forgot-password')}
                        className="text-xs font-medium text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-500" />
                      <input
                        id="login-password-input"
                        type="password"
                        {...registerLogin('password')}
                        placeholder="••••••••"
                        className="w-full pl-11 pr-4 py-3 bg-[#06080E] border border-blue-900/15 rounded-xl text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                    {loginErrors.password && (
                      <p className="text-xs text-rose-500 mt-1">{loginErrors.password.message}</p>
                    )}
                  </div>

                  {/* Remember Me Checkbox */}
                  <div className="flex items-center pb-1">
                    <input
                      id="remember-me-checkbox"
                      type="checkbox"
                      {...registerLogin('rememberMe')}
                      className="w-4 h-4 rounded border-blue-900/40 bg-[#06080E] text-blue-600 focus:ring-blue-500 focus:ring-offset-[#0A0D15]"
                    />
                    <label htmlFor="remember-me-checkbox" className="ml-2 text-xs font-medium text-gray-400 cursor-pointer hover:text-gray-300 transition-colors">
                      Remember me on this device
                    </label>
                  </div>

                  <button
                    id="login-submit-btn"
                    type="submit"
                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 rounded-xl text-sm font-semibold tracking-wide shadow-[0_0_20px_rgba(37,99,235,0.25)] transition-all cursor-pointer"
                  >
                    Sign In to Panel
                  </button>
                </form>
              ) : (
                /* Register Form */
                <form onSubmit={handleSignupSubmit(onSignup)} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-500" />
                      <input
                        id="signup-name-input"
                        type="text"
                        {...registerSignup('fullName')}
                        placeholder="Your Name"
                        className="w-full pl-11 pr-4 py-3 bg-[#06080E] border border-blue-900/15 rounded-xl text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                    {signupErrors.fullName && (
                      <p className="text-xs text-rose-500 mt-1">{signupErrors.fullName.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-500" />
                      <input
                        id="signup-email-input"
                        type="email"
                        {...registerSignup('email')}
                        placeholder="you@example.com"
                        className="w-full pl-11 pr-4 py-3 bg-[#06080E] border border-blue-900/15 rounded-xl text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                    {signupErrors.email && (
                      <p className="text-xs text-rose-500 mt-1">{signupErrors.email.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-500" />
                      <input
                        id="signup-phone-input"
                        type="text"
                        {...registerSignup('phone')}
                        placeholder="+1 (555) 0199"
                        className="w-full pl-11 pr-4 py-3 bg-[#06080E] border border-blue-900/15 rounded-xl text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                    {signupErrors.phone && (
                      <p className="text-xs text-rose-500 mt-1">{signupErrors.phone.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-500" />
                      <input
                        id="signup-password-input"
                        type="password"
                        {...registerSignup('password')}
                        placeholder="At least 6 characters"
                        className="w-full pl-11 pr-4 py-3 bg-[#06080E] border border-blue-900/15 rounded-xl text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                    {signupErrors.password && (
                      <p className="text-xs text-rose-500 mt-1">{signupErrors.password.message}</p>
                    )}
                  </div>

                  <button
                    id="signup-submit-btn"
                    type="submit"
                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 rounded-xl text-sm font-semibold tracking-wide shadow-[0_0_20px_rgba(37,99,235,0.25)] transition-all cursor-pointer"
                  >
                    Create SMM Account
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Auth;
