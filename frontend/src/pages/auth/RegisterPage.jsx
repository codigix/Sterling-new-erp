import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Lock, User, Mail, Eye, EyeOff, Boxes, Factory, UserCog, PenTool, ShoppingCart, ClipboardCheck, BarChart3 } from 'lucide-react';

const DEPARTMENTS = [
  { id: 'admin', name: 'Admin', icon: UserCog },
  { id: 'design_engineer', name: 'Design Engineer', icon: PenTool },
  { id: 'production', name: 'Production', icon: Factory },
  { id: 'procurement', name: 'Procurement', icon: ShoppingCart },
  { id: 'quality', name: 'Quality', icon: ClipboardCheck },
  { id: 'inventory', name: 'Inventory', icon: Boxes },
  { id: 'accountant', name: 'Accountant', icon: BarChart3 },
];

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    department: 'production',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleDeptSelect = (deptId) => {
    setFormData({
      ...formData,
      department: deptId
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    const result = await register(formData.fullName, formData.password, formData.department, formData.email);

    if (result.success) {
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
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

      <div className="w-full max-w-lg bg-white rounded shadow-sm border border-slate-200 p-5">
        <div className="flex bg-slate-100 p-1 rounded-md mb-4">
          <Link to="/login" className="flex-1 py-1.5 text-xs font-medium rounded text-slate-500 hover:text-slate-700 text-center">
            Sign In
          </Link>
          <button className="flex-1 py-1.5 text-xs font-medium rounded bg-white text-blue-600 shadow-sm">
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <div className="flex flex-col">
            <label htmlFor="fullName" className="text-xs font-medium text-slate-900 mb-0.5">Full Name</label>
            <div className="relative flex items-center">
              <User className="absolute left-3 text-slate-400" size={14} />
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                required
                placeholder="Enter your name"
                className="w-full py-1.5 pl-9 pr-4 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
              />
            </div>
          </div>

          <div className="flex flex-col">
            <label htmlFor="email" className="text-xs font-medium text-slate-900 mb-0.5">Email Address</label>
            <div className="relative flex items-center">
              <Mail className="absolute left-3 text-slate-400" size={14} />
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="test@example.com"
                className="w-full py-1.5 pl-9 pr-4 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
              />
            </div>
          </div>

          <div className="flex flex-col">
            <label className="text-xs font-medium text-slate-900 mb-0.5">Department</label>
            <div className="grid grid-cols-3 gap-1.5">
              {DEPARTMENTS.map((dept) => {
                const Icon = dept.icon;
                const isActive = formData.department === dept.id;
                return (
                  <button
                    key={dept.id}
                    type="button"
                    className={`flex flex-col items-center justify-center gap-1 p-1.5 border rounded-md transition-all h-14 ${
                      isActive 
                        ? 'border-blue-600 bg-blue-50 text-blue-600 ring-1 ring-blue-600' 
                        : 'border-slate-200 bg-white text-slate-500 hover:border-blue-400 hover:bg-slate-50'
                    }`}
                    onClick={() => handleDeptSelect(dept.id)}
                  >
                    <Icon size={14} />
                    <span className="text-[10px] font-medium text-center leading-tight">{dept.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col">
            <label htmlFor="password" title="Password" className="text-xs font-medium text-slate-900 mb-0.5">Password</label>
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
          </div>

          <div className="flex flex-col">
            <label htmlFor="confirmPassword" title="Confirm Password" className="text-xs font-medium text-slate-900 mb-0.5">Confirm Password</label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3 text-slate-400" size={14} />
              <input
                type={showConfirmPassword ? "text" : "password"}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                placeholder="••••••••"
                className="w-full py-1.5 pl-9 pr-9 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
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

          {error && <div className="p-1.5 bg-red-50 text-red-700 rounded-md text-[10px] border border-red-100">{error}</div>}
          {success && <div className="p-1.5 bg-green-50 text-green-700 rounded-md text-[10px] border border-green-100">Account created successfully!</div>}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md text-sm font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? "Creating Account..." : (
              <>
                Create Account <span className="text-base">→</span>
              </>
            )}
          </button>
        </form>
      </div>

      <div className="mt-4 text-center opacity-60">
        <p className="text-[11px] text-slate-500">© 2026 Sterling Manufacturing. Secure Enterprise Access.</p>
      </div>
    </div>
  );
};

export default RegisterPage;
