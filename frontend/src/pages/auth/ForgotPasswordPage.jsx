import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Mail, ArrowLeft, Send, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import axios from "../../utils/api";

const ForgotPasswordPage = () => {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);

    try {
      const response = await axios.post("/auth/forgot-password", { username });
      setSuccess(true);
      setUsername("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit request. Please try again.");
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
          Forgot Password
        </h2>
        <p className="text-xs text-slate-500 text-left mb-4">
          Enter your Email Address or Login ID to request a password reset from the administrator.
        </p>

        {success ? (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-800 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-emerald-950 mb-1">Request Submitted Successfully</p>
                <p className="leading-relaxed">Your password reset request has been sent to the administrator. Please notify them to approve your request and obtain your new password reset link.</p>
              </div>
            </div>
            <Link
              to="/login"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md text-sm flex items-center justify-center gap-2 transition-colors font-medium"
            >
              <ArrowLeft size={14} /> Back to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col">
              <label htmlFor="username" className="text-xs text-slate-900 mb-1.5 text-left font-medium">
                Email Address or Login ID
              </label>
              <div className="relative flex items-center">
                <Mail className="absolute left-3 text-slate-400" size={14} />
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  placeholder="Enter your email or login ID"
                  className="w-full py-2 pl-9 pr-4 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
                />
              </div>
            </div>

            {error && (
              <div className="p-2.5 bg-red-50 text-red-700 rounded-md text-xs border border-red-100 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex flex-col gap-2 mt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-70 disabled:cursor-not-allowed font-medium"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
                  </>
                ) : (
                  <>
                    Send Request <Send size={12} />
                  </>
                )}
              </button>

              <Link
                to="/login"
                className="w-full border border-slate-200 hover:bg-slate-50 text-slate-600 py-2 rounded-md text-sm flex items-center justify-center gap-2 transition-colors font-medium mt-1"
              >
                <ArrowLeft size={14} /> Cancel
              </Link>
            </div>
          </form>
        )}
      </div>

      <div className="mt-6 text-center opacity-60">
        <p className="text-xs text-slate-500">© 2026 Sterling Manufacturing. Secure Enterprise Access.</p>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
