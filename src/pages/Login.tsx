import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { auth, googleProvider, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Scissors } from 'lucide-react';
import { motion } from 'motion/react';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Check if user exists in Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const profile = userDoc.data();
        if (profile.role === 'admin') navigate('/admin');
        else if (profile.role === 'owner') navigate('/owner/dashboard');
        else navigate('/');
      } else {
        navigate('/onboarding');
      }
    } catch (error) {
      console.error('Login error:', error);
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
        
        <p className="mt-8 text-xs text-text-secondary">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </motion.div>
    </div>
  );
}
