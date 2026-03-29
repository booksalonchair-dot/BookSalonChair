import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { User, Store, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export default function Onboarding() {
  const { user, profile, isAuthReady } = useAuth();
  const [role, setRole] = useState<'customer' | 'owner' | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  React.useEffect(() => {
    if (isAuthReady && profile) {
      if (profile.role === 'admin') navigate('/admin');
      else if (profile.role === 'owner') navigate('/owner/dashboard');
      else navigate('/');
    }
  }, [profile, isAuthReady, navigate]);

  const handleComplete = async () => {
    if (!user || !role) return;
    setLoading(true);
    const path = `users/${user.uid}`;
    try {
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        name: user.displayName,
        photoURL: user.photoURL,
        role: role,
        createdAt: Timestamp.now(),
        notificationsEnabled: true,
      });
      
      if (role === 'owner') navigate('/owner/register');
      else navigate('/');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="max-w-2xl w-full">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl font-display font-bold text-center mb-12"
        >
          Tell us about yourself
        </motion.h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setRole('customer')}
            className={cn(
              "glass p-8 rounded-3xl text-left transition-all border-2",
              role === 'customer' ? "border-accent-primary bg-accent-primary/5" : "border-transparent"
            )}
          >
            <div className={cn(
              "w-16 h-16 rounded-2xl flex items-center justify-center mb-6",
              role === 'customer' ? "bg-accent-primary text-bg-primary" : "bg-bg-elevated text-text-secondary"
            )}>
              <User className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold mb-2">I'm a Customer</h3>
            <p className="text-text-secondary">I want to find and book premium salons near me.</p>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setRole('owner')}
            className={cn(
              "glass p-8 rounded-3xl text-left transition-all border-2",
              role === 'owner' ? "border-accent-primary bg-accent-primary/5" : "border-transparent"
            )}
          >
            <div className={cn(
              "w-16 h-16 rounded-2xl flex items-center justify-center mb-6",
              role === 'owner' ? "bg-accent-primary text-bg-primary" : "bg-bg-elevated text-text-secondary"
            )}>
              <Store className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold mb-2">I'm a Salon Owner</h3>
            <p className="text-text-secondary">I want to list my salon and manage bookings.</p>
          </motion.button>
        </div>

        <div className="flex justify-center">
          <button
            onClick={handleComplete}
            disabled={!role || loading}
            className="flex items-center gap-2 bg-accent-primary text-bg-primary px-12 py-4 rounded-full font-bold text-lg hover:scale-105 transition-transform disabled:opacity-50 disabled:scale-100"
          >
            {loading ? 'Setting up...' : 'Get Started'}
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
