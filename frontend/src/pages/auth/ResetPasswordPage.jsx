import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import axios from "../../utils/api";

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Token verification states
  const [verifying, setVerifying] = useState(true);
  const [tokenError, setTokenError] = useState("");
  const [userDetails, setUserDetails] = useState(null);

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setTokenError("Invalid reset URL. No password reset token was detected.");
        setVerifying(false);
        return;
      }

      try {
        const response = await axios.get(`/auth/verify-reset-token/${token}`);
        setUserDetails(response.data);
      } catch (err) {
        setTokenError(err.response?.data?.message || "Invalid or expired password reset link. Please check the URL or request a new one.");
      } finally {
        setVerifying(false);
      }
    };

    verifyToken();
  }, [token]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    if (!token) {
      setError("Reset token is missing from the URL. Please request a new link.");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await axios.post("/auth/reset-password", {
        token,
        password: formData.password,
      });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reset password. The link may have expired.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-2 font-sans overflow-hidden">
      <div className="text-center mb-4">
        <img src="/logo.png" alt="Sterling Logo" className="h-10 w-auto mx-auto mb-1" />
      </div>

      <div className="w-full max-w-md bg-white rounded border border-slate-200 p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-800 text-left mb-1">
          Reset Password
        </h2>
        <p className="text-xs text-slate-500 text-left mb-4">
          Please enter and confirm your new account password below.
        </p>

        {verifying ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
            <p className="text-xs text-slate-500">Verifying password reset link...</p>
          </div>
        ) : tokenError ? (
          <div className="space-y-4">
            <div className="p-3 bg-red-50 text-red-700 rounded-md text-xs border border-red-100 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <span className="text-left leading-relaxed">{tokenError}</span>
            </div>
            <Link
              to="/forgot-password"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md text-sm flex items-center justify-center gap-2 transition-colors font-medium"
            >
              Request New Reset Link
            </Link>
          </div>
        ) : success ? (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-800 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div className="text-left">
                <p className="font-medium text-emerald-950 mb-1">Password Changed Successfully</p>
                <p className="leading-relaxed">Your password has been successfully reset. You can now use your new password to sign in.</p>
              </div>
            </div>
            <Link
              to="/login"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md text-sm flex items-center justify-center gap-2 transition-colors font-medium"
            >
              Sign In Now
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Target Account Info */}
            {userDetails && (
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-md text-xs text-left mb-1 space-y-1">
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Resetting Password For</p>
                <p className="font-bold text-slate-800">{userDetails.full_name}</p>
                <p className="text-slate-500 font-mono text-[11px]">{userDetails.email || userDetails.login_id}</p>
              </div>
            )}

            {/* Password */}
            <div className="flex flex-col">
              <label htmlFor="password" className="text-xs text-slate-900 mb-1.5 text-left font-medium">
                New Password
              </label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3 text-slate-400" size={14} />
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  placeholder="••••••••••••"
                  className="w-full py-2 pl-9 pr-9 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                />
                <button
                  type="button"
                  className="absolute right-3 text-slate-400 hover:text-blue-600"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex="-1"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="flex flex-col">
              <label htmlFor="confirmPassword" className="text-xs text-slate-900 mb-1.5 text-left font-medium">
                Repeat Password
              </label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3 text-slate-400" size={14} />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  placeholder="••••••••••••"
                  className="w-full py-2 pl-9 pr-9 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                />
                <button
                  type="button"
                  className="absolute right-3 text-slate-400 hover:text-blue-600"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  tabIndex="-1"
                >
                  {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-2.5 bg-red-50 text-red-700 rounded-md text-xs border border-red-100 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <span className="text-left">{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-70 disabled:cursor-not-allowed font-medium mt-2 shadow"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Resetting Password...
                </>
              ) : (
                "Reset Password"
              )}
            </button>
          </form>
        )}
      </div>

      <div className="mt-6 text-center opacity-60">
        <p className="text-xs text-slate-500">© 2026 Sterling Manufacturing. Secure Enterprise Access.</p>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
