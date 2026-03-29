import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, Timestamp, addDoc, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { Booking, Salon, Message } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { X, Send, User, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ChatModalProps {
  booking: Booking;
  onClose: () => void;
}

export default function ChatModal({ booking, onClose }: ChatModalProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'chats', booking.id, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      setMessages(msgData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [booking.id]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newMessage.trim()) return;

    const text = newMessage.trim();
    setNewMessage('');

    try {
      await addDoc(collection(db, 'chats', booking.id, 'messages'), {
        senderId: user.uid,
        text,
        timestamp: Timestamp.now(),
        read: false,
      });

      // Update chat meta
      await updateDoc(doc(db, 'chats', booking.id), {
        lastMessage: text,
        lastUpdated: Timestamp.now(),
      });
    } catch (error) {
      console.error('Send error:', error);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass w-full max-w-2xl h-[600px] rounded-3xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-bg-elevated/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-accent-primary/10 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-accent-primary" />
            </div>
            <div>
              <h3 className="font-bold text-lg">{booking.salonName}</h3>
              <p className="text-xs text-text-secondary">Booking #{booking.id.slice(0, 8)}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide">
          {loading ? (
            <div className="flex items-center justify-center h-full">Loading chat...</div>
          ) : messages.length > 0 ? (
            messages.map((msg) => (
              <div 
                key={msg.id}
                className={cn(
                  "flex flex-col max-w-[80%]",
                  msg.senderId === user?.uid ? "ml-auto items-end" : "items-start"
                )}
              >
                <div className={cn(
                  "px-4 py-3 rounded-2xl text-sm",
                  msg.senderId === user?.uid 
                    ? "bg-accent-primary text-bg-primary rounded-tr-none" 
                    : "bg-bg-elevated text-text-primary rounded-tl-none"
                )}>
                  {msg.text}
                </div>
                <span className="text-[10px] text-text-secondary mt-1">
                  {msg.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-text-secondary opacity-50">
              <MessageSquare className="w-12 h-12 mb-4" />
              <p>No messages yet. Say hello!</p>
            </div>
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="p-6 bg-bg-elevated/30 border-t border-white/10 flex gap-4">
          <input 
            type="text" 
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 bg-bg-elevated border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-accent-primary transition-colors"
          />
          <button 
            type="submit"
            disabled={!newMessage.trim()}
            className="bg-accent-primary text-bg-primary p-3 rounded-xl hover:scale-105 transition-transform disabled:opacity-50"
          >
            <Send className="w-6 h-6" />
          </button>
        </form>
      </motion.div>
    </div>
  );
}
