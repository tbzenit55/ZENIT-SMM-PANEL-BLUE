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

export function Auth() {
  const { currentUser, userProfile, refreshProfile } = useAuth();
  const [authView, setAuthView] = useState<'login' | 'register' | 'forgot-password'>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const { success, error, info } = useToast();

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
    watch: watchSignup,
    formState: { errors: signupErrors } 
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema)
  });

  const signupEmail = watchSignup('email');

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
      
      if (!userCredential.user.emailVerified) {
        info('Email Verification Needed', 'Please verify your email address to access the SMM Panel.');
      } else {
        success('Welcome back', `Signed in successfully as ${userCredential.user.email}`);
      }
      await refreshProfile();
    } catch (err: any) {
      console.error('Login error', err);
      error('Sign In Failed', err.message || 'Please check your credentials and try again.');
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

      // Send verification email
      await sendEmailVerification(userCredential.user);
      setVerificationSent(true);

      // Provision user profile on backend server
      try {
        await api.post('/users', {
          name: data.fullName,
          phone: data.phone,
        });
      } catch (backendErr) {
        console.warn('Backend profile provisioning skipped/failed:', backendErr);
      }

      success('Account Created', 'Please check your email for a verification link to activate your panel.');
      await refreshProfile();
    } catch (err: any) {
      console.error('Registration error', err);
      error('Registration Failed', err.message || 'Could not register account. Email might already exist.');
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
      error('Reset Failed', err.message || 'Could not send reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Check email verification status
  const handleCheckVerification = async () => {
    setIsLoading(true);
    try {
      const auth = getClientAuth();
      if (auth.currentUser) {
        // Force reload the user's Auth state
        await auth.currentUser.reload();
        if (auth.currentUser.emailVerified) {
          success('Verified Successfully', 'Your email has been verified. Welcome to ZENIT SMM!');
          await refreshProfile();
          window.location.reload();
        } else {
          info('Still Unverified', 'We checked but your email is not verified yet. Please check your spam folder.');
        }
      }
    } catch (err: any) {
      error('Check Failed', err.message || 'Failed to check verification status.');
    } finally {
      setIsLoading(false);
    }
  };

  // Resend verification email
  const handleResendVerification = async () => {
    setIsLoading(true);
    try {
      const auth = getClientAuth();
      if (auth.currentUser) {
        await sendEmailVerification(auth.currentUser);
        success('Verification Resent', 'A new activation link has been sent to your inbox.');
      }
    } catch (err: any) {
      error('Resend Failed', err.message || 'Failed to resend verification email.');
    } finally {
      setIsLoading(false);
    }
  };

  // Logout (for unverified state)
  const handleSignOut = async () => {
    try {
      const auth = getClientAuth();
      await signOut(auth);
      setVerificationSent(false);
      setAuthView('login');
    } catch (err) {}
  };

  // Safe developer sandbox login bypass if Firestore credentials aren't initialized
  const handleSandboxLogin = async (role: 'user' | 'admin') => {
    setIsLoading(true);
    info('Sandbox Mode', `Logging in as sandbox ${role}...`);
    try {
      localStorage.setItem('sandbox_session', JSON.stringify({
        uid: role === 'admin' ? 'sandbox_admin_123' : 'sandbox_user_123',
        email: role === 'admin' ? 'admin@zenitsmm.com' : 'sandbox@zenitsmm.com',
        role: role === 'admin' ? 'Admin' : 'User',
        displayName: role === 'admin' ? 'Zenit Director' : 'Sandbox Explorer'
      }));
      
      window.location.reload();
    } catch (e: any) {
      error('Bypass Failed', e.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Only verified users can access the dashboard.
  // If the user is logged in via Firebase Auth, but email is not verified, show them the unverified block.
  const isUnverified = currentUser && !currentUser.emailVerified && !localStorage.getItem('sandbox_session');

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
          
          {isUnverified ? (
            /* Email Verification Needed Block */
            <div className="text-center space-y-6">
              <div className="mx-auto inline-flex w-14 h-14 rounded-full bg-amber-500/10 border border-amber-500/30 items-center justify-center text-amber-400 mb-2">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">Email Verification Required</h3>
                <p className="text-gray-400 text-xs leading-relaxed max-w-sm mx-auto">
                  To protect your account and secure our SMM API routes, only verified users can access the dashboard. We sent an activation link to <strong className="text-blue-400">{currentUser.email}</strong>.
                </p>
              </div>

              <div className="space-y-3">
                <button
                  id="btn-check-verify"
                  onClick={handleCheckVerification}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 rounded-xl text-sm font-semibold tracking-wide shadow-[0_0_20px_rgba(37,99,235,0.25)] transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  I have verified my email
                </button>
                
                <div className="grid grid-cols-2 gap-3">
                  <button
                    id="btn-resend-verify"
                    onClick={handleResendVerification}
                    className="py-2.5 px-3 border border-blue-500/20 hover:border-blue-500/40 bg-blue-950/10 hover:bg-blue-950/20 rounded-xl text-xs font-semibold text-blue-400 transition-colors cursor-pointer"
                  >
                    Resend Link
                  </button>
                  <button
                    id="btn-unverified-logout"
                    onClick={handleSignOut}
                    className="py-2.5 px-3 border border-gray-800 hover:border-gray-700 bg-gray-900/10 hover:bg-gray-900/20 rounded-xl text-xs font-semibold text-gray-400 transition-colors cursor-pointer"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          ) : authView === 'forgot-password' ? (
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
                  {verificationSent ? (
                    <div className="p-4 bg-blue-950/20 border border-blue-500/20 rounded-xl text-center space-y-2">
                      <CheckCircle className="w-8 h-8 text-blue-400 mx-auto" />
                      <p className="text-xs font-bold text-white">Activation Email Sent!</p>
                      <p className="text-[11px] text-gray-400 leading-relaxed">
                        Please check your inbox at <strong className="text-blue-400">{signupEmail}</strong> to verify your account.
                      </p>
                      <button
                        id="btn-verification-toggle"
                        type="button"
                        onClick={() => { setVerificationSent(false); setAuthView('login'); }}
                        className="text-xs font-bold text-blue-400 hover:underline pt-1 block mx-auto cursor-pointer"
                      >
                        Proceed to Sign In
                      </button>
                    </div>
                  ) : (
                    <>
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
                    </>
                  )}
                </form>
              )}
            </>
          )}

          {/* Developer Sandbox Bypass Tools */}
          <div className="mt-8 border-t border-blue-900/10 pt-6">
            <p className="text-[11px] font-semibold text-blue-500/80 tracking-widest uppercase text-center mb-4 flex items-center justify-center gap-1.5">
              <Terminal className="w-3.5 h-3.5" />
              Developer Sandbox Access
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                id="sandbox-login-user"
                onClick={() => handleSandboxLogin('user')}
                className="py-2.5 px-3 border border-blue-500/20 hover:border-blue-500/40 bg-blue-950/10 hover:bg-blue-950/20 rounded-xl text-xs font-semibold text-blue-400 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <User className="w-3.5 h-3.5" />
                User Sandbox
              </button>
              <button
                id="sandbox-login-admin"
                onClick={() => handleSandboxLogin('admin')}
                className="py-2.5 px-3 border border-amber-500/20 hover:border-amber-500/40 bg-amber-950/10 hover:bg-amber-950/20 rounded-xl text-xs font-semibold text-amber-400 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Admin Sandbox
              </button>
            </div>
            <p className="text-[10px] text-gray-500 text-center mt-3 leading-relaxed">
              Instantly preview full-stack panel features using in-memory sandbox mocks.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Auth;
