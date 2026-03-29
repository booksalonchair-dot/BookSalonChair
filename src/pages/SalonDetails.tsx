import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, addDoc, Timestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { Salon, Service, Booking } from '../types';
import { formatCurrency, cn, getImageUrl } from '../lib/utils';
import { Star, MapPin, CheckCircle2, Calendar as CalendarIcon, ChevronRight, ChevronLeft, Scissors } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, addDays, startOfToday, isSameDay } from 'date-fns';

export default function SalonDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [salon, setSalon] = useState<Salon | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [bookingStep, setBookingStep] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date>(startOfToday());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);

  useEffect(() => {
    if (id) fetchSalon();
  }, [id]);

  const fetchSalon = async () => {
    const path = `salons/${id}`;
    try {
      const docRef = doc(db, 'salons', id!);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setSalon({ id: docSnap.id, ...docSnap.data() } as Salon);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    } finally {
      setLoading(false);
    }
  };

  const toggleService = (service: Service) => {
    setSelectedServices(prev => 
      prev.find(s => s.id === service.id)
        ? prev.filter(s => s.id !== service.id)
        : [...prev, service]
    );
  };

  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);

  const handleBooking = async () => {
    if (!user || !salon || !selectedTime) return;
    setBookingLoading(true);
    const path = 'bookings';
    try {
      const bookingData = {
        userId: user.uid,
        salonId: salon.id,
        ownerId: salon.ownerId,
        salonName: salon.name,
        services: selectedServices.map(s => ({ name: s.name, price: s.price })),
        totalPrice,
        date: format(selectedDate, 'yyyy-MM-dd'),
        timeSlot: selectedTime,
        status: 'pending',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        chatEnabled: false,
      };

      await addDoc(collection(db, path), bookingData);
      navigate('/bookings');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!salon) return <div className="min-h-screen flex items-center justify-center">Salon not found</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-12">
      {/* Hero & Gallery */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="relative h-[400px] rounded-3xl overflow-hidden">
            <img src={getImageUrl(salon.frontPhoto)} alt={salon.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            <div className="absolute bottom-8 left-8">
              <h1 className="text-4xl font-display font-bold mb-2">{salon.name}</h1>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 text-accent-primary font-bold">
                  <Star className="w-5 h-5 fill-accent-primary" />
                  {salon.rating} ({salon.totalReviews} reviews)
                </div>
                <div className="flex items-center gap-1 text-text-secondary">
                  <MapPin className="w-5 h-5" />
                  {salon.address}
                </div>
              </div>
            </div>
          </div>

          <div className="glass p-8 rounded-3xl">
            <h2 className="text-2xl font-bold mb-4">About the Salon</h2>
            <p className="text-text-secondary leading-relaxed">{salon.description}</p>
          </div>
        </div>
      </section>

      {/* Services & Booking */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <h2 className="text-3xl font-display font-bold">Our Services</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {salon.services.map((service) => (
              <button
                key={service.id}
                onClick={() => toggleService(service)}
                className={cn(
                  "p-6 rounded-3xl text-left transition-all border-2",
                  selectedServices.find(s => s.id === service.id)
                    ? "bg-accent-primary/5 border-accent-primary"
                    : "glass border-transparent hover:border-white/10"
                )}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-lg font-bold">{service.name}</h4>
                  </div>
                  {selectedServices.find(s => s.id === service.id) && (
                    <CheckCircle2 className="w-6 h-6 text-accent-primary" />
                  )}
                </div>
                <div className="text-xl font-bold text-accent-secondary">{formatCurrency(service.price)}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Booking Sidebar */}
        <div className="relative">
          <div className="glass p-8 rounded-3xl sticky top-40 space-y-8">
            <h3 className="text-2xl font-bold">Book Appointment</h3>
            
            {selectedServices.length === 0 ? (
              <div className="text-center py-8 text-text-secondary">
                <Scissors className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>Select services to continue</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-3">
                  {selectedServices.map(s => (
                    <div key={s.id} className="flex justify-between text-sm">
                      <span>{s.name}</span>
                      <span className="font-bold">{formatCurrency(s.price)}</span>
                    </div>
                  ))}
                  <div className="pt-3 border-t border-white/10 flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-accent-primary">{formatCurrency(totalPrice)}</span>
                  </div>
                </div>

                {bookingStep === 0 ? (
                  <button 
                    onClick={() => setBookingStep(1)}
                    className="w-full bg-accent-primary text-bg-primary py-4 rounded-2xl font-bold hover:scale-105 transition-transform"
                  >
                    Choose Date & Time
                  </button>
                ) : (
                  <div className="space-y-6">
                    {/* Date Picker */}
                    <div className="space-y-3">
                      <label className="text-sm font-bold text-text-secondary uppercase tracking-wider">Select Date</label>
                      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        {[...Array(14)].map((_, i) => {
                          const date = addDays(startOfToday(), i);
                          const isSelected = isSameDay(date, selectedDate);
                          return (
                            <button
                              key={i}
                              onClick={() => setSelectedDate(date)}
                              className={cn(
                                "flex flex-col items-center min-w-[64px] p-3 rounded-2xl transition-all",
                                isSelected ? "bg-accent-primary text-bg-primary" : "bg-bg-elevated text-text-secondary hover:bg-bg-elevated/80"
                              )}
                            >
                              <span className="text-[10px] uppercase font-bold">{format(date, 'EEE')}</span>
                              <span className="text-lg font-bold">{format(date, 'd')}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Time Picker */}
                    <div className="space-y-3">
                      <label className="text-sm font-bold text-text-secondary uppercase tracking-wider">Select Time</label>
                      <div className="grid grid-cols-3 gap-2">
                        {['10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00'].map((time) => (
                          <button
                            key={time}
                            onClick={() => setSelectedTime(time)}
                            className={cn(
                              "py-2 rounded-xl text-sm font-bold transition-all",
                              selectedTime === time ? "bg-accent-secondary text-bg-primary" : "bg-bg-elevated text-text-secondary hover:bg-bg-elevated/80"
                            )}
                          >
                            {time}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button 
                        onClick={() => setBookingStep(0)}
                        className="flex-1 bg-bg-elevated py-4 rounded-2xl font-bold hover:bg-bg-elevated/80 transition-colors"
                      >
                        Back
                      </button>
                      <button 
                        onClick={handleBooking}
                        disabled={!selectedTime || bookingLoading}
                        className="flex-[2] bg-accent-primary text-bg-primary py-4 rounded-2xl font-bold hover:scale-105 transition-transform disabled:opacity-50"
                      >
                        {bookingLoading ? 'Booking...' : 'Confirm Booking'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
