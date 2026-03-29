import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { auth, googleProvider, db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { Scissors } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';

export default function Login() {
  const { user, profile, isAuthReady } = useAuth();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  React.useEffect(() => {
    if (isAuthReady && user) {
      if (profile?.role === 'admin') navigate('/admin');
      else if (profile?.role === 'owner') navigate('/owner/dashboard');
      else if (profile) navigate('/');
      else navigate('/onboarding');
    }
  }, [user, profile, isAuthReady, navigate]);

  const handleGoogleLogin = async () => {
    console.log('Starting Google Login...');
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      console.log('Login successful:', user.email);
      toast.success('Signed in successfully!');
      
      // Check if user exists in Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const profile = userDoc.data();
        console.log('User profile found:', profile.role);
        if (profile.role === 'admin') navigate('/admin');
        else if (profile.role === 'owner') navigate('/owner/dashboard');
        else navigate('/');
      } else {
        console.log('New user, navigating to onboarding');
        navigate('/onboarding');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.code === 'auth/popup-blocked') {
        toast.error('Sign-in popup was blocked. Please allow popups for this site.');
      } else if (error.code === 'auth/unauthorized-domain') {
        toast.error('This domain is not authorized for Google Sign-in. Please contact the administrator.');
      } else {
        toast.error('Failed to sign in. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass p-12 rounded-3xl max-w-md w-full text-center"
      >
        <div className="flex justify-center mb-8">
          <div className="w-20 h-20 bg-accent-primary/10 rounded-full flex items-center justify-center">
            <Scissors className="w-10 h-10 text-accent-primary" />
          </div>
        </div>
        <h1 className="text-3xl font-display font-bold mb-4">Welcome to Salon Chair</h1>
        <p className="text-text-secondary mb-10">Discover and book premium salons near you instantly.</p>
        
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white text-black py-4 rounded-xl font-bold hover:bg-gray-100 transition-colors disabled:opacity-50"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" />
          {loading ? 'Connecting...' : 'Continue with Google'}
        </button>

        <p className="mt-4 text-xs text-text-secondary">
          If the popup doesn't appear, please check your browser's popup blocker.
        </p>
        
        <p className="mt-8 text-xs text-text-secondary">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </motion.div>
    </div>
  );
}
