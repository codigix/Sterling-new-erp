import React, { useState } from 'react';
import axios from '../../utils/api';
import { toast } from 'react-toastify';
import Card, { CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { Lock, Eye, EyeOff } from 'lucide-react';

const SystemSettings = () => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!oldPassword || !newPassword || !confirmPassword) {
      toast.warning('All password fields are required');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      toast.warning('New password must be at least 6 characters long');
      return;
    }

    try {
      setSubmitting(true);
      const response = await axios.put('/auth/change-password', {
        oldPassword,
        newPassword
      });

      if (response.data.success || response.status === 200) {
        toast.success(response.data.message || 'Password updated successfully');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setShowOldPassword(false);
        setShowNewPassword(false);
        setShowConfirmPassword(false);
      }
    } catch (err) {
      console.error('Password change error:', err);
      toast.error(err.response?.data?.message || 'Failed to update password');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full min-h-screen p-6 flex justify-center items-start bg-slate-50/50 dark:bg-slate-900/50">
      <div className="w-full max-w-md mt-8">
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 border border-slate-200 dark:border-slate-800">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
                <Lock className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="text-left">
                <CardTitle className="text-lg font-bold text-slate-800 dark:text-white">Security Settings</CardTitle>
                <p className="text-xs text-slate-500 dark:text-slate-400">Change your administrator password</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              <Input
                label="Current Password"
                type={showOldPassword ? "text" : "password"}
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="••••••••"
                required
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowOldPassword(!showOldPassword)}
                    className="text-slate-400 hover:text-slate-600 focus:outline-none transition-colors cursor-pointer"
                  >
                    {showOldPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
              />
              <Input
                label="New Password"
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                required
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="text-slate-400 hover:text-slate-600 focus:outline-none transition-colors cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
              />
              <Input
                label="Confirm New Password"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="text-slate-400 hover:text-slate-600 focus:outline-none transition-colors cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
              />
              
              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  loading={submitting}
                  className="w-full justify-center"
                >
                  Update Password
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SystemSettings;
