import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/AuthContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import SalonDetails from './pages/SalonDetails';
import UserBookings from './pages/UserBookings';
import OwnerDashboard from './pages/OwnerDashboard';
import AdminPanel from './pages/AdminPanel';
import Login from './pages/Login';
import Onboarding from './pages/Onboarding';
import SalonRegistration from './pages/SalonRegistration';

const ProtectedRoute = ({ children, role }: { children: React.ReactNode; role?: string }) => {
  const { user, profile, loading, isAuthReady } = useAuth();

  if (!isAuthReady || loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (role && profile?.role !== role && profile?.role !== 'admin') return <Navigate to="/" />;

  return <>{children}</>;
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-bg-primary text-text-primary">
          <Navbar />
          <main className="container mx-auto px-4 py-8">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
              <Route path="/salon/:id" element={<SalonDetails />} />
              
              {/* Customer Routes */}
              <Route path="/bookings" element={<ProtectedRoute role="customer"><UserBookings /></ProtectedRoute>} />
              
              {/* Owner Routes */}
              <Route path="/owner/register" element={<ProtectedRoute role="owner"><SalonRegistration /></ProtectedRoute>} />
              <Route path="/owner/dashboard" element={<ProtectedRoute role="owner"><OwnerDashboard /></ProtectedRoute>} />
              
              {/* Admin Routes */}
              <Route path="/admin" element={<ProtectedRoute role="admin"><AdminPanel /></ProtectedRoute>} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}
