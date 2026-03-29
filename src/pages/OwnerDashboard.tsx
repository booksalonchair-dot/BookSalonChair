import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, doc, updateDoc, Timestamp, getDocs, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { Booking, Salon } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { format } from 'date-fns';
import { LayoutDashboard, Calendar, Users, TrendingUp, Star, Check, X, MessageSquare, Clock, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import QRCode from 'qrcode';
import ChatModal from '../components/ChatModal';

export default function OwnerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [salon, setSalon] = useState<Salon | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [selectedChat, setSelectedChat] = useState<Booking | null>(null);

  useEffect(() => {
    if (!user) return;

    // Fetch Salon
    const qSalon = query(collection(db, 'salons'), where('ownerId', '==', user.uid));
    const unsubSalon = onSnapshot(qSalon, (snapshot) => {
      if (!snapshot.empty) {
        const salonData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Salon;
        setSalon(salonData);
        generatePaymentQR(salonData.id);
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'salons');
    });

    // Fetch Bookings
    const qBookings = query(collection(db, 'bookings'), where('ownerId', '==', user.uid));
    const unsubBookings = onSnapshot(qBookings, (snapshot) => {
      const bookingData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
      setBookings(bookingData.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis()));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'bookings');
    });

    return () => {
      unsubSalon();
      unsubBookings();
    };
  }, [user]);

  const generatePaymentQR = async (salonId: string) => {
    const month = new Date().toLocaleString('default', { month: 'long' });
    const year = new Date().getFullYear();
    const upiString = `upi://pay?pa=citimobilesknr-1@oksbi&pn=SalonChair&am=200&cu=INR&tn=salon_${salonId}_${month}_${year}`;
    try {
      const url = await QRCode.toDataURL(upiString);
      setQrCode(url);
    } catch (err) {
      console.error('QR error:', err);
    }
  };

  const handleStatus = async (bookingId: string, status: 'accepted' | 'rejected') => {
    const path = `bookings/${bookingId}`;
    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        status,
        chatEnabled: status === 'accepted',
        updatedAt: Timestamp.now()
      });
      
      if (status === 'accepted') {
        // Create chat document
        await setDoc(doc(db, 'chats', bookingId), {
          bookingId,
          participants: [bookings.find(b => b.id === bookingId)?.userId, user?.uid],
          lastMessage: 'Booking accepted! You can now chat.',
          lastUpdated: Timestamp.now(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading Dashboard...</div>;

  if (!salon) return (
    <div className="min-h-screen flex flex-col items-center justify-center space-y-6 p-8 text-center">
      <div className="w-24 h-24 bg-accent-primary/10 rounded-full flex items-center justify-center mb-4">
        <LayoutDashboard className="w-12 h-12 text-accent-primary" />
      </div>
      <h2 className="text-3xl font-display font-bold">No Salon Found</h2>
      <p className="text-text-secondary max-w-md">
        You haven't registered your salon yet. To start receiving bookings and managing your business, please complete the registration process.
      </p>
      <button 
        onClick={() => navigate('/owner/register')}
        className="bg-accent-primary text-bg-primary px-12 py-4 rounded-2xl font-bold text-lg hover:scale-105 transition-transform"
      >
        Register Your Salon
      </button>
    </div>
  );

  if (!salon.isApproved) return (
    <div className="min-h-screen flex flex-col items-center justify-center space-y-6 p-8 text-center">
      <div className="w-24 h-24 bg-warning/10 rounded-full flex items-center justify-center mb-4">
        <Clock className="w-12 h-12 text-warning" />
      </div>
      <h2 className="text-3xl font-display font-bold">Approval Pending</h2>
      <p className="text-text-secondary max-w-md">
        Your salon <strong>{salon.name}</strong> has been submitted and is currently being reviewed by our administrators. This usually takes 12-24 hours.
      </p>
      <div className="bg-bg-elevated p-6 rounded-3xl text-left w-full max-w-md">
        <div className="font-bold mb-2">Next Steps:</div>
        <ul className="list-disc list-inside space-y-2 text-sm text-text-secondary">
          <li>Wait for admin verification</li>
          <li>Once approved, you'll need to pay the ₹200 subscription</li>
          <li>Your listing will then go live for customers</li>
        </ul>
      </div>
    </div>
  );

  const stats = [
    { label: 'Total Appointments', value: bookings.length, icon: Calendar, color: 'text-accent-primary' },
    { label: 'Pending Approvals', value: bookings.filter(b => b.status === 'pending').length, icon: Clock, color: 'text-warning' },
    { label: 'Total Revenue', value: formatCurrency(bookings.filter(b => b.status === 'completed').reduce((sum, b) => sum + b.totalPrice, 0)), icon: TrendingUp, color: 'text-success' },
    { label: 'Average Rating', value: salon.rating, icon: Star, color: 'text-accent-secondary' },
  ];

  return (
    <div className="space-y-12">
      {/* Header & Subscription Alert */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-display font-bold mb-2">Welcome, {salon.name}</h1>
          <p className="text-text-secondary">Manage your appointments and listing details.</p>
        </div>
        {!salon.isLive && (
          <div className="bg-error/10 border border-error/20 p-4 rounded-2xl flex items-center gap-4">
            <AlertCircle className="w-8 h-8 text-error" />
            <div>
              <div className="font-bold text-error">Listing Inactive</div>
              <p className="text-sm text-text-secondary">Pay ₹200 to activate your salon for 30 days.</p>
            </div>
            <button 
              onClick={() => (document.getElementById('payment-modal') as any)?.showModal()}
              className="bg-error text-white px-6 py-2 rounded-xl font-bold hover:bg-error/80 transition-colors"
            >
              Pay Now
            </button>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="glass p-8 rounded-3xl">
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-6 bg-white/5", stat.color)}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div className="text-3xl font-bold mb-1">{stat.value}</div>
            <div className="text-sm text-text-secondary uppercase tracking-wider">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Appointment Management */}
      <section className="space-y-8">
        <h2 className="text-3xl font-display font-bold">Recent Appointments</h2>
        <div className="glass rounded-3xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-bg-elevated/50 text-text-secondary text-sm uppercase tracking-wider">
                  <th className="px-8 py-6">Customer</th>
                  <th className="px-8 py-6">Service</th>
                  <th className="px-8 py-6">Date & Time</th>
                  <th className="px-8 py-6">Status</th>
                  <th className="px-8 py-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {bookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-8 py-6">
                      <div className="font-bold">Customer #{booking.userId.slice(0, 6)}</div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-wrap gap-1">
                        {booking.services.map((s, i) => (
                          <span key={i} className="bg-bg-elevated px-2 py-0.5 rounded text-xs">
                            {s.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="font-medium">{format(new Date(booking.date), 'MMM d, yyyy')}</div>
                      <div className="text-xs text-text-secondary">{booking.timeSlot}</div>
                    </td>
                    <td className="px-8 py-6">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-xs font-bold",
                        booking.status === 'pending' ? "text-warning bg-warning/10" :
                        booking.status === 'accepted' ? "text-success bg-success/10" :
                        booking.status === 'rejected' ? "text-error bg-error/10" :
                        "text-text-secondary bg-bg-elevated"
                      )}>
                        {booking.status}
                      </span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        {booking.status === 'pending' && (
                          <>
                            <button 
                              onClick={() => handleStatus(booking.id, 'accepted')}
                              className="p-2 bg-success/10 text-success rounded-lg hover:bg-success/20 transition-colors"
                            >
                              <Check className="w-5 h-5" />
                            </button>
                            <button 
                              onClick={() => handleStatus(booking.id, 'rejected')}
                              className="p-2 bg-error/10 text-error rounded-lg hover:bg-error/20 transition-colors"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </>
                        )}
                        {booking.status === 'accepted' && (
                          <button 
                            onClick={() => setSelectedChat(booking)}
                            className="p-2 bg-accent-secondary/10 text-accent-secondary rounded-lg hover:bg-accent-secondary/20 transition-colors"
                          >
                            <MessageSquare className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Payment Modal */}
      <dialog id="payment-modal" className="modal bg-transparent">
        <div className="modal-box glass max-w-md p-8 rounded-3xl text-center space-y-8">
          <h3 className="text-2xl font-bold">Activate Your Listing</h3>
          <p className="text-text-secondary">Scan the QR code below using any UPI app (Google Pay, PhonePe, Paytm) to pay ₹200.</p>
          
          {qrCode && (
            <div className="bg-white p-4 rounded-2xl inline-block mx-auto">
              <img src={qrCode} alt="Payment QR" className="w-64 h-64" />
            </div>
          )}

          <div className="space-y-4">
            <div className="bg-bg-elevated p-4 rounded-2xl text-sm text-left">
              <div className="font-bold mb-1">Instructions:</div>
              <ol className="list-decimal list-inside space-y-1 text-text-secondary">
                <li>Scan QR with any UPI app</li>
                <li>Pay exactly ₹200</li>
                <li>Wait for admin verification (usually 1-2 hours)</li>
                <li>Your salon will go live automatically</li>
              </ol>
            </div>
            <button 
              onClick={() => (document.getElementById('payment-modal') as any)?.close()}
              className="w-full bg-accent-primary text-bg-primary py-4 rounded-2xl font-bold"
            >
              Done
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>

      {selectedChat && (
        <ChatModal 
          booking={selectedChat} 
          onClose={() => setSelectedChat(null)} 
        />
      )}
    </div>
  );
}
