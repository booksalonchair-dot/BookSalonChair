import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { db, storage, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, setDoc, Timestamp, GeoPoint, collection, Bytes } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Trash2, Upload, MapPin, Clock, Store, Scissors } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

const schema = z.object({
  name: z.string().min(3, 'Salon name is required'),
  description: z.string().min(10, 'Description is required'),
  address: z.string().min(5, 'Address is required'),
  services: z.array(z.object({
    name: z.string().min(1, 'Service name is required'),
    price: z.number().min(1, 'Price is required'),
  })).min(1, 'At least one service is required'),
});

type FormData = z.infer<typeof schema>;

export default function SalonRegistration() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [frontPhoto, setFrontPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const navigate = useNavigate();

  const { register, control, handleSubmit, formState: { errors }, setValue } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      services: [{ name: '', price: 0 }],
    }
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'services' });

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFrontPhoto(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 600;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Compress to 0.7 quality to keep size small for Firestore
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          resolve(dataUrl);
        };
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const onSubmit = async (data: FormData) => {
    if (!user || !frontPhoto) return;
    setLoading(true);
    const path = 'salons';
    try {
      // 1. Compress and convert to Base64
      const base64Image = await compressImage(frontPhoto);
      
      // 2. Convert Base64 string to a Uint8Array (binary/numeric data)
      const base64Data = base64Image.split(',')[1];
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // 3. Save Salon to Firestore (No Storage upload)
      const salonId = doc(collection(db, 'salons')).id;
      await setDoc(doc(db, 'salons', salonId), {
        ownerId: user.uid,
        ...data,
        frontPhoto: Bytes.fromUint8Array(bytes), // Storing as numeric/binary data
        gallery: [],
        location: new GeoPoint(28.6139, 77.2090),
        rating: 0,
        totalReviews: 0,
        isApproved: false,
        isLive: false,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      navigate('/owner/dashboard');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-4xl font-display font-bold mb-8">Register Your Salon</h1>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-12">
        {/* Basic Info */}
        <section className="glass p-8 rounded-3xl space-y-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Store className="w-6 h-6 text-accent-primary" />
            Basic Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm text-text-secondary">Salon Name</label>
              <input {...register('name')} className="w-full bg-bg-elevated border border-white/10 rounded-xl p-4 focus:outline-none focus:border-accent-primary" />
              {errors.name && <p className="text-error text-xs">{errors.name.message}</p>}
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm text-text-secondary">Description</label>
              <textarea {...register('description')} rows={4} className="w-full bg-bg-elevated border border-white/10 rounded-xl p-4 focus:outline-none focus:border-accent-primary" />
              {errors.description && <p className="text-error text-xs">{errors.description.message}</p>}
            </div>
            <div className="md:col-span-2 space-y-2">
              <label className="text-sm text-text-secondary">Full Address</label>
              <input {...register('address')} className="w-full bg-bg-elevated border border-white/10 rounded-xl p-4 focus:outline-none focus:border-accent-primary" />
              {errors.address && <p className="text-error text-xs">{errors.address.message}</p>}
            </div>
          </div>
        </section>

        {/* Photos */}
        <section className="glass p-8 rounded-3xl space-y-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Upload className="w-6 h-6 text-accent-primary" />
            Salon Photos
          </h2>
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-3xl p-12 hover:border-accent-primary transition-colors cursor-pointer relative overflow-hidden">
            {preview ? (
              <img src={preview} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="text-center">
                <Upload className="w-12 h-12 text-text-secondary mx-auto mb-4" />
                <p className="text-text-secondary">Upload front view photo (Required)</p>
              </div>
            )}
            <input type="file" accept="image/*" onChange={handlePhotoChange} className="absolute inset-0 opacity-0 cursor-pointer" />
          </div>
        </section>

        {/* Services */}
        <section className="glass p-8 rounded-3xl space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Scissors className="w-6 h-6 text-accent-primary" />
              Services
            </h2>
            <button 
              type="button" 
              onClick={() => append({ name: '', price: 0 })}
              className="flex items-center gap-2 text-accent-secondary hover:text-accent-secondary/80 font-bold"
            >
              <Plus className="w-5 h-5" />
              Add Service
            </button>
          </div>
          
          <div className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-bg-elevated rounded-2xl relative group">
                <input {...register(`services.${index}.name`)} placeholder="Service Name" className="bg-transparent border-b border-white/10 py-2 focus:outline-none focus:border-accent-primary" />
                <div className="flex items-center gap-2">
                  <input type="number" {...register(`services.${index}.price`, { valueAsNumber: true })} placeholder="Charges (₹)" className="flex-1 bg-transparent border-b border-white/10 py-2 focus:outline-none focus:border-accent-primary" />
                  <button type="button" onClick={() => remove(index)} className="text-error opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="flex justify-center pt-8">
          <button
            type="submit"
            disabled={loading}
            className="bg-accent-primary text-bg-primary px-16 py-4 rounded-full font-bold text-xl hover:scale-105 transition-transform disabled:opacity-50"
          >
            {loading ? 'Submitting...' : 'Submit Listing for Approval'}
          </button>
        </div>
      </form>
    </div>
  );
}
