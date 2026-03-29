import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, Timestamp, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Salon, UserProfile } from '../types';
import { formatCurrency, cn, getImageUrl } from '../lib/utils';
import { ShieldCheck, Store, Users, CreditCard, Check, X, Eye, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function AdminPanel() {
  const [salons, setSalons] = useState<Salon[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'approvals' | 'salons' | 'users'>('approvals');
  const [selectedSalon, setSelectedSalon] = useState<Salon | null>(null);

  useEffect(() => {
    // Fetch Salons
    const unsubSalons = onSnapshot(collection(db, 'salons'), (snapshot) => {
      const salonData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Salon));
      setSalons(salonData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'salons');
    });

    // Fetch Users
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const userData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any as UserProfile));
      setUsers(userData);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'users');
    });

    return () => {
      unsubSalons();
      unsubUsers();
    };
  }, []);

  const handleApprove = async (salonId: string, type: 'approval' | 'payment') => {
    const path = `salons/${salonId}`;
    try {
      const updates: any = {};
      if (type === 'approval') updates.isApproved = true;
      if (type === 'payment') {
        updates.isLive = true;
        updates.liveExpiryDate = Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
      }
      updates.updatedAt = Timestamp.now();
      
      await updateDoc(doc(db, 'salons', salonId), updates);
      setSelectedSalon(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const pendingApprovals = salons.filter(s => !s.isApproved);
  const activeSalons = salons.filter(s => s.isApproved);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading Admin Panel...</div>;

  return (
    <div className="space-y-12">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-accent-primary/10 rounded-3xl flex items-center justify-center">
          <ShieldCheck className="w-10 h-10 text-accent-primary" />
        </div>
        <div>
          <h1 className="text-4xl font-display font-bold">Admin Control Center</h1>
          <p className="text-text-secondary">Manage approvals, salons, and platform users.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-white/5">
        {[
          { id: 'approvals', label: 'Pending Approvals', count: pendingApprovals.length, icon: Store },
          { id: 'salons', label: 'Active Salons', count: activeSalons.length, icon: CreditCard },
          { id: 'users', label: 'User Management', count: users.length, icon: Users },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex items-center gap-2 px-6 py-4 font-bold transition-all relative",
              activeTab === tab.id ? "text-accent-primary" : "text-text-secondary hover:text-text-primary"
            )}
          >
            <tab.icon className="w-5 h-5" />
            {tab.label}
            {tab.count > 0 && (
              <span className="bg-accent-primary text-bg-primary text-[10px] px-1.5 py-0.5 rounded-full">
                {tab.count}
              </span>
            )}
            {activeTab === tab.id && (
              <motion.div layoutId="admin-tab" className="absolute bottom-0 left-0 right-0 h-1 bg-accent-primary rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="glass rounded-3xl overflow-hidden">
        {activeTab === 'approvals' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-bg-elevated/50 text-text-secondary text-sm uppercase tracking-wider">
                  <th className="px-8 py-6">Salon Name</th>
                  <th className="px-8 py-6">Owner Email</th>
                  <th className="px-8 py-6">Services</th>
                  <th className="px-8 py-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {pendingApprovals.map((salon) => (
                  <tr key={salon.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-8 py-6 font-bold">{salon.name}</td>
                    <td className="px-8 py-6 text-text-secondary">{salon.ownerId}</td>
                    <td className="px-8 py-6">{salon.services.length} services</td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setSelectedSalon(salon)}
                          className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => handleApprove(salon.id, 'approval')}
                          className="p-2 bg-success/10 text-success rounded-lg hover:bg-success/20 transition-colors"
                        >
                          <Check className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'salons' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-bg-elevated/50 text-text-secondary text-sm uppercase tracking-wider">
                  <th className="px-8 py-6">Salon</th>
                  <th className="px-8 py-6">Status</th>
                  <th className="px-8 py-6">Expiry</th>
                  <th className="px-8 py-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {activeSalons.map((salon) => (
                  <tr key={salon.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-8 py-6 font-bold">{salon.name}</td>
                    <td className="px-8 py-6">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-xs font-bold",
                        salon.isLive ? "text-success bg-success/10" : "text-error bg-error/10"
                      )}>
                        {salon.isLive ? 'Live' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-text-secondary">
                      {salon.liveExpiryDate ? salon.liveExpiryDate.toDate().toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-8 py-6">
                      <button 
                        onClick={() => handleApprove(salon.id, 'payment')}
                        className="flex items-center gap-2 bg-accent-secondary/10 text-accent-secondary px-4 py-2 rounded-xl text-sm font-bold hover:bg-accent-secondary/20 transition-colors"
                      >
                        <CreditCard className="w-4 h-4" />
                        Verify Payment
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-bg-elevated/50 text-text-secondary text-sm uppercase tracking-wider">
                  <th className="px-8 py-6">User</th>
                  <th className="px-8 py-6">Email</th>
                  <th className="px-8 py-6">Role</th>
                  <th className="px-8 py-6">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map((u) => (
                  <tr key={u.uid} className="hover:bg-white/5 transition-colors">
                    <td className="px-8 py-6 flex items-center gap-3">
                      <img src={u.photoURL} alt="" className="w-8 h-8 rounded-full" />
                      <span className="font-bold">{u.name}</span>
                    </td>
                    <td className="px-8 py-6 text-text-secondary">{u.email}</td>
                    <td className="px-8 py-6">
                      <span className="capitalize bg-bg-elevated px-3 py-1 rounded-full text-xs font-bold">
                        {u.role}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-text-secondary">
                      {u.createdAt.toDate().toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Salon Details Modal */}
      <AnimatePresence>
        {selectedSalon && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="glass w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl p-8 space-y-8"
            >
              <div className="flex justify-between items-start">
                <h2 className="text-3xl font-bold">{selectedSalon.name}</h2>
                <button onClick={() => setSelectedSalon(null)} className="p-2 hover:bg-white/5 rounded-full">
                  <X className="w-8 h-8" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <img src={getImageUrl(selectedSalon.frontPhoto)} alt="" className="w-full h-64 object-cover rounded-2xl" />
                <div className="space-y-4">
                  <div className="text-sm text-text-secondary uppercase tracking-wider">Description</div>
                  <p>{selectedSalon.description}</p>
                  <div className="text-sm text-text-secondary uppercase tracking-wider">Address</div>
                  <p>{selectedSalon.address}</p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-bold">Services ({selectedSalon.services.length})</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {selectedSalon.services.map((s, i) => (
                    <div key={i} className="bg-bg-elevated p-4 rounded-xl">
                      <div className="font-bold">{s.name}</div>
                      <div className="text-accent-secondary">{formatCurrency(s.price)}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-8 border-t border-white/5">
                <button 
                  onClick={() => setSelectedSalon(null)}
                  className="px-8 py-3 rounded-xl font-bold bg-bg-elevated hover:bg-bg-elevated/80 transition-colors"
                >
                  Close
                </button>
                <button 
                  onClick={() => handleApprove(selectedSalon.id, 'approval')}
                  className="px-8 py-3 rounded-xl font-bold bg-success text-white hover:bg-success/80 transition-colors"
                >
                  Approve Salon
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
