import React, { useState, useCallback, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Lock, Mail, Eye, EyeOff } from "lucide-react";

const ROLE_MAP = {
  admin: "/admin/dashboard",
  design_engineer: "/design-engineer/dashboard",
  production: "/department/production",
  production_head: "/department/production",
  procurement: "/department/procurement",
  quality: "/department/quality",
  inventory: "/department/inventory",
  inventory_management: "/department/inventory",
  accountant: "/accountant/dashboard",
};
 
const LoginPage = () => {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { login, user } = useAuth();
  const navigate = useNavigate();

  const normalizeRoleName = (role) => {
    if (!role) return "";
    return role.trim().toLowerCase().replace(/\s+/g, "_");
  };

  const getRolePath = useCallback((userData = {}) => {
    if (userData.type === 'employee') return "/employee/dashboard";
    const role = userData.role || "";
    const normalizedRole = normalizeRoleName(role);
    return ROLE_MAP[normalizedRole] || "/department/root-cards";
  }, []);

  useEffect(() => {
    if (user?.role) {
      navigate(getRolePath(user), { replace: true });
    }
  }, [user, navigate, getRolePath]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await login(formData.username, formData.password);

    if (result.success) {
      navigate(getRolePath(result.user || {}));
    } else {
      setError(result.message);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-2 font-sans overflow-hidden">
      <div className="text-center mb-4">
        <img src="/logo.png" alt="Sterling Logo" className="h-10 w-auto mx-auto mb-1" />
      </div>

      <div className="w-full max-w-md bg-white rounded  border border-slate-200 p-5">
        <div className="flex bg-slate-100 p-1 rounded-md mb-4">
          <button className="flex-1 py-1.5 text-xs  rounded bg-white text-blue-600 ">
            Sign In
          </button>
          <Link to="/register" className="flex-1 py-1.5 text-xs  rounded text-slate-500 hover:text-slate-700 text-center">
            Register
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col">
            <label htmlFor="username" className="text-xs  text-slate-900 mb-0.5">
              Email Address
            </label>
            <div className="relative flex items-center">
              <Mail className="absolute left-3 text-slate-400" size={14} />
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                placeholder="Enter your email"
                className="w-full py-1.5 pl-9 pr-4 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
              />
            </div>
          </div>

          <div className="flex flex-col">
            <label htmlFor="password" title="Password" className="text-xs text-slate-900 mb-1 text-left font-medium">
              Password
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
                className="w-full py-1.5 pl-9 pr-9 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
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
            <div className="text-right mt-1.5">
              <Link to="/forgot-password" className="text-xs text-blue-600 hover:underline font-medium">
                Forgot Password?
              </Link>
            </div>
          </div>

          {error && (
            <div className="p-1.5 bg-red-50 text-red-700 rounded-md text-xs border border-red-100">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md text-sm  flex items-center justify-center gap-2 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in..." : (
              <>
                Sign In <span className="text-base">→</span>
              </>
            )}
          </button>
        </form>

      </div>

      <div className="mt-4 text-center opacity-60">
        <p className="text-xs text-slate-500">© 2026 Sterling Manufacturing. Secure Enterprise Access.</p>
      </div>
    </div>
  );
};

export default LoginPage;
