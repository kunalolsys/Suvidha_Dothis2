import React, { useState, useEffect } from 'react';
import { Mail, Eye, EyeOff, ArrowRight, ShieldCheck, TestTube2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom'; // Import useSearchParams
import { toast } from 'sonner';
import axios from 'axios'; // For API calls
import api from '../lib/api';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams(); // Get URL search parameters
  const token = searchParams.get('token'); // Extract the token from the URL

  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false); // New state to indicate if reset email was sent

  // Determine if we are in the password reset phase (token present) or email verification phase
  const isPasswordResetPhase = !!token;

  // Effect to handle initial state if a token is present
  useEffect(() => {
    if (isPasswordResetPhase) {
      // Optionally, you might want to validate the token here immediately
      // or just proceed to show the password fields.
      // For now, we'll just show the password fields.
    }
  }, [isPasswordResetPhase]);

  const handleSendResetEmail = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // Call backend API to send reset email
      const res = await api.post(`/auth/forgot-password`, { email });
      if (res.data.success) {
        toast.success(res.data.message || 'Password reset link has been sent.');
        setEmailSent(true); // Indicate that the email has been sent

        // --- FOR LOCAL TESTING ONLY: Display the token ---
        if (import.meta.env.DEV && res.data.token) {
          toast.info(`Local Test Token: ${res.data.token}`, { duration: 10000 });
        }
      } else {
        toast.error(res.data.message || 'Failed to send reset email.');
      }
    } catch (err) {
      setEmailSent(false); // Ensure we don't show success UI on error
      if (err.response && err.response.status === 404) {
        toast.error('Email not exist');
      } else {
        toast.error(err.response?.data?.message || 'Error sending reset email. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }
    if (newPassword.length < 6) { // Basic password strength check
      toast.error('Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);

    // --- FOR LOCAL TESTING ONLY ---
    // If using the special test token in development, simulate a success without calling the API.
    if (import.meta.env.DEV && token === 'local-test-token') {
      setTimeout(() => {
        setIsLoading(false);
        toast.success('Password reset successfully! Please log in with your new password.');
        navigate('/'); // Redirect to login page
      }, 1000); // Simulate network delay
      return; // Skip the actual API call
    }
    // --- END LOCAL TESTING ONLY ---

    try {
      // Call backend API to reset password using the token
      const res = await api.post(`/auth/reset-password`, { token, newPassword });
      toast.success(res.data.message || 'Password reset successfully! Please log in with your new password.');
      navigate('/'); // Redirect to login page
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error resetting password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 space-y-6 border border-gray-100">

        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-full bg-blue-50 mb-2">
            <ShieldCheck className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Reset Password</h2>
          <p className="text-gray-500 text-sm">
            {!isPasswordResetPhase
              ? (emailSent ? "Check your email for the reset link." : "Enter your email to receive a password reset link")
              : "Create a strong password for your account"}
          </p>
        </div>

        {!isPasswordResetPhase ? (
          <form onSubmit={handleSendResetEmail} className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 ml-1">Your Email</label>
              <div className="relative">
                <Mail className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="name@company.com"
                  disabled={emailSent} // Disable input after email is sent
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={isLoading || emailSent} // Disable button if loading or email already sent
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-all transform active:scale-[0.98] disabled:opacity-70"
            >
              {isLoading ? "Sending..." : (emailSent ? "Link Sent!" : "Send Reset Link")}
              {!isLoading && !emailSent && <ArrowRight className="w-4 h-4" />}
            </button>
            {/* {emailSent && (
              <button
                type="button"
                onClick={() => navigate('/reset-password?token=local-test-token')}
                className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-xl transition-all"
              >
                <TestTube2 className="w-4 h-4" />
                Reset Password (Test)
              </button>
            )} */}
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4 animate-in fade-in slide-in-from-right-8 duration-500">

            {/* New Password Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 ml-1">New Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 ml-1">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full px-4 py-3 bg-gray-50 border rounded-xl focus:ring-2 outline-none transition-all ${confirmPassword && newPassword !== confirmPassword
                    ? "border-red-300 focus:ring-red-200"
                    : "border-gray-200 focus:ring-blue-500"
                    }`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-red-500 ml-1">Passwords do not match</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || newPassword !== confirmPassword || newPassword.length < 6}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition-all transform active:scale-[0.98] shadow-lg shadow-blue-500/30 mt-2 disabled:opacity-70"
            >
              {isLoading ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        )}

        <div className="text-center">
          <a href="/" className="text-sm text-gray-500 hover:text-gray-800 transition-colors flex items-center justify-center gap-1 group">
            <ArrowRight className="w-4 h-4 rotate-180 group-hover:-translate-x-1 transition-transform" />
            Back to Login
          </a>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;