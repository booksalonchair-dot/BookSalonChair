import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { auth } from '../lib/firebase';
import { Scissors, User, LogOut, LayoutDashboard, Calendar, ShieldCheck } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Navbar() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/login');
  };

  return (
    <nav className="sticky top-0 z-50 glass-nav">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-accent-primary font-display text-xl font-bold">
          <Scissors className="w-6 h-6" />
          <span>Salon Chair</span>
        </Link>

        <div className="flex items-center gap-6">
          {user ? (
            <>
              {profile?.role === 'customer' && (
                <Link to="/bookings" className="text-text-secondary hover:text-text-primary transition-colors flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span className="hidden sm:inline">My Bookings</span>
                </Link>
              )}
              {profile?.role === 'owner' && (
                <Link to="/owner/dashboard" className="text-text-secondary hover:text-text-primary transition-colors flex items-center gap-2">
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="hidden sm:inline">Dashboard</span>
                </Link>
              )}
              {profile?.role === 'admin' && (
                <Link to="/admin" className="text-text-secondary hover:text-text-primary transition-colors flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  <span className="hidden sm:inline">Admin</span>
                </Link>
              )}
              <div className="flex items-center gap-4 border-l border-white/10 pl-6">
                <div className="flex items-center gap-2">
                  <img src={user.photoURL || ''} alt={user.displayName || ''} className="w-8 h-8 rounded-full border border-accent-primary/30" />
                  <span className="hidden md:inline text-sm font-medium">{user.displayName}</span>
                </div>
                <button onClick={handleLogout} className="text-text-secondary hover:text-error transition-colors">
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </>
          ) : (
            <Link to="/login" className="bg-accent-primary text-bg-primary px-6 py-2 rounded-full font-bold hover:scale-105 transition-transform">
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
