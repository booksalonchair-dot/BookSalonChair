import { Timestamp, GeoPoint } from 'firebase/firestore';

export type UserRole = 'customer' | 'owner' | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  photoURL: string;
  role: UserRole;
  createdAt: Timestamp;
  fcmToken?: string;
  location?: GeoPoint;
  notificationsEnabled: boolean;
}

export interface Service {
  id: string;
  name: string;
  price: number;
}

export interface Salon {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  address: string;
  location: GeoPoint;
  frontPhoto: string;
  gallery: string[];
  services: Service[];
  rating: number;
  totalReviews: number;
  isApproved: boolean;
  isLive: boolean;
  liveExpiryDate?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Booking {
  id: string;
  userId: string;
  salonId: string;
  ownerId: string;
  salonName: string;
  services: Pick<Service, 'name' | 'price'>[];
  totalPrice: number;
  date: string;
  timeSlot: string;
  status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  chatEnabled: boolean;
  rejectionReason?: string;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: Timestamp;
  read: boolean;
}

export interface Chat {
  id: string;
  bookingId: string;
  participants: string[];
  lastMessage: string;
  lastUpdated: Timestamp;
}

export interface Payment {
  id: string;
  salonId: string;
  amount: number;
  month: string;
  year: number;
  qrCodeUrl: string;
  status: 'pending' | 'paid' | 'failed';
  paymentMethod: 'upi';
  transactionId?: string;
  verifiedBy?: string;
  verifiedAt?: Timestamp;
  expiresAt?: Timestamp;
}
