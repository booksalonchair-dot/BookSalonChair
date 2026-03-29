import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, GeoPoint } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Salon } from '../types';
import { calculateDistance, cn, formatCurrency, getImageUrl } from '../lib/utils';
import { MapPin, Star, Search, Filter, Navigation } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';

export default function Home() {
  const [salons, setSalons] = useState<Salon[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchSalons();
  }, []);

  const fetchSalons = async () => {
    setLoading(true);
    const path = 'salons';
    try {
      const q = query(
        collection(db, path),
        where('isApproved', '==', true),
        where('isLive', '==', true)
      );
      const snapshot = await getDocs(q);
      const salonData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Salon));
      setSalons(salonData);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    } finally {
      setLoading(false);
    }
  };

  const detectLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Error detecting location:', error);
        }
      );
    }
  };

  const filteredSalons = salons
    .filter(salon => {
      const matchesSearch = salon.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          salon.services.some(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesFilter = filter === 'all' || salon.services.some(s => s.category.toLowerCase() === filter.toLowerCase());
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      if (!userLocation) return 0;
      const distA = calculateDistance(userLocation.lat, userLocation.lng, a.location.latitude, a.location.longitude);
      const distB = calculateDistance(userLocation.lat, userLocation.lng, b.location.latitude, b.location.longitude);
      return distA - distB;
    });

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="relative h-[500px] rounded-3xl overflow-hidden flex items-center justify-center text-center px-4">
        <img 
          src="https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=1920" 
          alt="Salon Interior" 
          className="absolute inset-0 w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 to-black/90" />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 max-w-3xl"
        >
          <h1 className="text-5xl md:text-7xl font-display font-bold mb-6">Book Your Perfect Look at Salon Chair</h1>
          <p className="text-xl text-text-secondary mb-10">Discover premium salons near you. Book instantly. Look stunning.</p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={detectLocation}
              className="flex items-center gap-2 bg-accent-primary text-bg-primary px-8 py-4 rounded-full font-bold hover:scale-105 transition-transform"
            >
              <Navigation className="w-5 h-5" />
              Find Salons Near Me
            </button>
            <div className="flex items-center gap-8 text-sm font-medium">
              <div className="text-center">
                <div className="text-accent-secondary text-2xl font-bold">500+</div>
                <div className="text-text-secondary">Salons</div>
              </div>
              <div className="text-center">
                <div className="text-accent-secondary text-2xl font-bold">10k+</div>
                <div className="text-text-secondary">Happy Customers</div>
              </div>
              <div className="text-center">
                <div className="text-accent-secondary text-2xl font-bold">50+</div>
                <div className="text-text-secondary">Cities</div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Search & Filters */}
      <section className="glass p-6 rounded-3xl sticky top-20 z-40">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary w-5 h-5" />
            <input 
              type="text" 
              placeholder="Search salons or services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-bg-elevated border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-accent-primary transition-colors"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
            {['All', 'Hair', 'Skin', 'Nail', 'Massage'].map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat.toLowerCase())}
                className={cn(
                  "px-6 py-4 rounded-2xl font-medium whitespace-nowrap transition-all",
                  filter === cat.toLowerCase() ? "bg-accent-primary text-bg-primary" : "bg-bg-elevated text-text-secondary hover:bg-bg-elevated/80"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Salons Grid */}
      <section>
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-display font-bold">
            {userLocation ? 'Salons Near You' : 'Discover Salons'}
          </h2>
          <div className="text-text-secondary text-sm">
            Showing {filteredSalons.length} results
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="glass h-[400px] rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : filteredSalons.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredSalons.map((salon) => (
              <SalonCard key={salon.id} salon={salon} userLocation={userLocation} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 glass rounded-3xl">
            <MapPin className="w-16 h-16 text-text-secondary mx-auto mb-4 opacity-20" />
            <h3 className="text-2xl font-bold mb-2">No salons found</h3>
            <p className="text-text-secondary">Try adjusting your search or filters.</p>
          </div>
        )}
      </section>
    </div>
  );
}

interface SalonCardProps {
  salon: Salon;
  userLocation: { lat: number; lng: number } | null;
}

const SalonCard: React.FC<SalonCardProps> = ({ salon, userLocation }) => {
  const distance = userLocation 
    ? calculateDistance(userLocation.lat, userLocation.lng, salon.location.latitude, salon.location.longitude)
    : null;

  const minPrice = Math.min(...salon.services.map(s => s.price));

  return (
    <motion.div 
      whileHover={{ scale: 1.02 }}
      className="glass rounded-3xl overflow-hidden group"
    >
      <Link to={`/salon/${salon.id}`}>
        <div className="relative h-56 overflow-hidden">
          <img 
            src={getImageUrl(salon.frontPhoto)} 
            alt={salon.name} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            referrerPolicy="no-referrer"
          />
          <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1 text-sm font-bold">
            <Star className="w-4 h-4 text-accent-primary fill-accent-primary" />
            {salon.rating}
          </div>
          {distance !== null && (
            <div className="absolute bottom-4 left-4 bg-accent-primary text-bg-primary px-3 py-1 rounded-full text-xs font-bold">
              {distance < 1000 ? `${Math.round(distance)}m` : `${(distance / 1000).toFixed(1)}km`} away
            </div>
          )}
        </div>
        <div className="p-6">
          <h3 className="text-xl font-bold mb-2 group-hover:text-accent-primary transition-colors">{salon.name}</h3>
          <div className="flex items-center gap-2 text-text-secondary text-sm mb-4">
            <MapPin className="w-4 h-4" />
            <span className="truncate">{salon.address}</span>
          </div>
          <div className="flex items-center justify-between pt-4 border-t border-white/5">
            <div>
              <div className="text-xs text-text-secondary uppercase tracking-wider">Starting from</div>
              <div className="text-lg font-bold text-accent-secondary">{formatCurrency(minPrice)}</div>
            </div>
            <button className="bg-bg-elevated hover:bg-bg-elevated/80 px-4 py-2 rounded-xl text-sm font-bold transition-colors">
              View Details
            </button>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};
