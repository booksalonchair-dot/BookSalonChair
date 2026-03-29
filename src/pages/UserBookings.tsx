import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { Booking } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { Calendar, Clock, MessageSquare, XCircle, CheckCircle2, History, Ban } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, isAfter, parse } from 'date-fns';
import ChatModal from '../components/ChatModal';

export default function UserBookings() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'cancelled'>('upcoming');
  const [selectedChat, setSelectedChat] = useState<Booking | null>(null);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'bookings'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const bookingData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
      setBookings(bookingData.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis()));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'bookings');
    });

    return () => unsubscribe();
  }, [user]);

  const filteredBookings = bookings.filter(b => {
    if (activeTab === 'upcoming') return b.status === 'pending' || b.status === 'accepted';
    if (activeTab === 'past') return b.status === 'completed';
    if (activeTab === 'cancelled') return b.status === 'cancelled' || b.status === 'rejected';
    return true;
  });

  const handleCancel = async (bookingId: string) => {
    const path = `bookings/${bookingId}`;
    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        status: 'cancelled',
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <h1 className="text-4xl font-display font-bold">My Bookings</h1>

      <div className="flex gap-2 bg-bg-elevated p-2 rounded-2xl">
        {(['upcoming', 'past', 'cancelled'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 py-3 rounded-xl font-bold capitalize transition-all",
              activeTab === tab ? "bg-accent-primary text-bg-primary" : "text-text-secondary hover:bg-white/5"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        <AnimatePresence mode="popLayout">
          {filteredBookings.length > 0 ? (
            filteredBookings.map((booking) => (
              <motion.div
                key={booking.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass p-6 rounded-3xl flex flex-col md:flex-row gap-6 items-start md:items-center"
              >
                <div className="flex-1 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-bold">{booking.salonName}</h3>
                    <StatusBadge status={booking.status} />
                  </div>
                  
                  <div className="flex flex-wrap gap-4 text-sm text-text-secondary">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-accent-primary" />
                      {format(new Date(booking.date), 'MMMM d, yyyy')}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-accent-primary" />
                      {booking.timeSlot}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {booking.services.map((s, i) => (
                      <span key={i} className="bg-bg-elevated px-3 py-1 rounded-full text-xs font-medium">
                        {s.name}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="w-full md:w-auto flex flex-col gap-2 border-t md:border-t-0 md:border-l border-white/5 pt-4 md:pt-0 md:pl-6">
                  <div className="text-right mb-2">
                    <div className="text-xs text-text-secondary uppercase tracking-wider">Total Paid</div>
                    <div className="text-xl font-bold text-accent-secondary">{formatCurrency(booking.totalPrice)}</div>
                  </div>
                  
                  <div className="flex gap-2">
                    {booking.status === 'accepted' && (
                      <button 
                        onClick={() => setSelectedChat(booking)}
                        className="flex-1 md:w-auto flex items-center justify-center gap-2 bg-accent-secondary text-bg-primary px-6 py-3 rounded-xl font-bold hover:scale-105 transition-transform"
                      >
                        <MessageSquare className="w-4 h-4" />
                        Chat
                      </button>
                    )}
                    {booking.status === 'pending' && (
                      <button 
                        onClick={() => handleCancel(booking.id)}
                        className="flex-1 md:w-auto flex items-center justify-center gap-2 bg-error/10 text-error px-6 py-3 rounded-xl font-bold hover:bg-error/20 transition-colors"
                      >
                        <XCircle className="w-4 h-4" />
                        Cancel
                      </button>
                    )}
                    {booking.status === 'completed' && (
                      <button className="flex-1 md:w-auto flex items-center justify-center gap-2 bg-accent-primary text-bg-primary px-6 py-3 rounded-xl font-bold hover:scale-105 transition-transform">
                        <History className="w-4 h-4" />
                        Book Again
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-20 glass rounded-3xl">
              <Calendar className="w-16 h-16 text-text-secondary mx-auto mb-4 opacity-20" />
              <h3 className="text-2xl font-bold mb-2">No {activeTab} bookings</h3>
              <p className="text-text-secondary">Your appointments will appear here.</p>
            </div>
          )}
        </AnimatePresence>
      </div>

      {selectedChat && (
        <ChatModal 
          booking={selectedChat} 
          onClose={() => setSelectedChat(null)} 
        />
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: Booking['status'] }) {
  const config = {
    pending: { icon: Clock, color: 'text-warning bg-warning/10', label: 'Pending' },
    accepted: { icon: CheckCircle2, color: 'text-success bg-success/10', label: 'Accepted' },
    rejected: { icon: Ban, color: 'text-error bg-error/10', label: 'Rejected' },
    completed: { icon: CheckCircle2, color: 'text-accent-secondary bg-accent-secondary/10', label: 'Completed' },
    cancelled: { icon: XCircle, color: 'text-text-secondary bg-bg-elevated', label: 'Cancelled' },
  };

  const { icon: Icon, color, label } = config[status];

  return (
    <div className={cn("flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold", color)}>
      <Icon className="w-3.5 h-3.5" />
      {label}
    </div>
  );
}
