'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Upload,
  Tag,
  Monitor,
  Cpu,
  Star,
  Shield,
  Loader2,
  Minus,
  Plus,
  Calendar,
} from 'lucide-react';
import { gsap } from 'gsap';
import { useRouter, useParams } from 'next/navigation';
import { db } from '@/server/firebaseApi';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

// Appwrite storage import (ensure this is a Storage instance)
import { storage } from '@/server/appwrite';
import { v4 as uuidv4 } from 'uuid';

interface WindowApp {
  id: string;
  title: string;
  description: string;
  image: string; // existing image URL
  price: string;
  os: string;
  architecture: string;
  rating: string;
  security: string;
  screenshots: string[]; // existing screenshot URLs
  date: string;
}

const cropAndResizeImage = (file: File, maxSize = 500): Promise<File> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };

    img.onerror = (err) => reject(err);

    img.onload = () => {
      const size = Math.min(img.width, img.height);
      const canvas = document.createElement('canvas');
      canvas.width = maxSize;
      canvas.height = maxSize;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        const x = (img.width - size) / 2;
        const y = (img.height - size) / 2;
        ctx.drawImage(img, x, y, size, size, 0, 0, maxSize, maxSize);
      }

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const pngFile = new File(
              [blob],
              file.name.replace(/\.[^/.]+$/, '') + '.png',
              { type: 'image/png' }
            );
            resolve(pngFile);
          } else {
            reject(new Error('Canvas toBlob returned null'));
          }
        },
        'image/png',
        1.0
      );
    };

    reader.readAsDataURL(file);
  });
};

const resizeImage = (file: File, maxSize = 800): Promise<File> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };

    img.onerror = (err) => reject(err);

    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxSize) {
          height *= maxSize / width;
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width *= maxSize / height;
          height = maxSize;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = Math.round(width);
      canvas.height = Math.round(height);

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      }

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const pngFile = new File(
              [blob],
              file.name.replace(/\.[^/.]+$/, '') + '.png',
              { type: 'image/png' }
            );
            resolve(pngFile);
          } else {
            reject(new Error('Canvas toBlob returned null'));
          }
        },
        'image/png',
        1.0
      );
    };

    reader.readAsDataURL(file);
  });
};

const toUrlString = (u: any): string => {
  if (!u) return '';
  if (typeof u === 'string') return u;
  if (typeof u?.toString === 'function') return u.toString();
  if (u?.href) return u.href;
  return String(u);
};

const uploadToAppwrite = async (file: File, bucketId: string) => {
  // storage.createFile(bucketId, 'unique()', file) -> returns uploaded file object with $id
  // storage.getFileDownload(bucketId, uploaded.$id) -> returns URL object or string
  const uploaded = await storage.createFile(bucketId, 'unique()', file);
  const url = storage.getFileDownload(bucketId, uploaded.$id);
  return toUrlString(url);
};

const EditWindowPage: React.FC = () => {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [formData, setFormData] = useState<WindowApp>({
    id: '',
    title: '',
    description: '',
    image: '',
    price: '',
    os: '',
    architecture: '',
    rating: '',
    security: '',
    screenshots: [''],
    date: '',
  });

  // File states for replaced uploads
  const [imageFile, setImageFile] = useState<File | null>(null); // new main image file (cropped)
  const [imagePreview, setImagePreview] = useState<string>(''); // preview (either existing URL or local object URL)
  const [screenshotFiles, setScreenshotFiles] = useState<File[]>([]); // newly added screenshot files
  const [screenshotPreviews, setScreenshotPreviews] = useState<string[]>([]); // previews for new screenshots
  const [existingScreenshots, setExistingScreenshots] = useState<string[]>([]); // existing URLs from firestore

  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState(0); // overall progress 0 - 100
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  const dropRef = useRef<HTMLDivElement | null>(null);

  // Fetch existing doc
  useEffect(() => {
    const fetchApp = async () => {
      try {
        if (!id) return;
        const docRef = doc(db, 'Windows-tools', id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as WindowApp;
          setFormData({
            id: docSnap.id,
            title: data.title || '',
            description: data.description || '',
            image: data.image || '',
            price: data.price || '',
            os: data.os || '',
            architecture: data.architecture || '',
            rating: data.rating || '',
            security: data.security || '',
            screenshots: data.screenshots || [''],
            date: data.date || new Date().toLocaleDateString(),
          });

          setImagePreview(data.image || '');
          setExistingScreenshots(data.screenshots || []);
        } else {
          console.warn('No such document!');
        }
      } catch (error) {
        console.error('Error fetching document:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchApp();
  }, [id]);

  // GSAP animation for container and fade-ins
  useEffect(() => {
    if (!loading) {
      gsap.from('.edit-container', {
        opacity: 0,
        y: 50,
        duration: 0.8,
        ease: 'power3.out',
      });

      gsap.from('.fade-item', {
        opacity: 0,
        y: 20,
        duration: 0.6,
        stagger: 0.06,
        delay: 0.1,
        ease: 'power3.out',
      });
    }
  }, [loading]);

  // Handle normal text / select change
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle new main image selection (crop & preview)
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) return;
    try {
      const cropped = await cropAndResizeImage(file, 500);
      setImageFile(cropped);
      const previewUrl = URL.createObjectURL(cropped);
      setImagePreview(previewUrl);
    } catch (err) {
      console.error('Image crop error', err);
      // fallback to direct preview
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // Handle screenshot file selection (multiple)
  const handleScreenshotsChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (!files.length) return;
    // resize each screenshot
    const resized = await Promise.all(files.map((f) => resizeImage(f, 800)));
    setScreenshotFiles((prev) => [...prev, ...resized]);
    const newPreviews = resized.map((f) => URL.createObjectURL(f));
    setScreenshotPreviews((prev) => [...prev, ...newPreviews]);
  };

  // Drag & drop screenshots (resize)
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
    if (!files.length) return;
    const resized = await Promise.all(files.map((f) => resizeImage(f, 800)));
    setScreenshotFiles((prev) => [...prev, ...resized]);
    const newPreviews = resized.map((f) => URL.createObjectURL(f));
    setScreenshotPreviews((prev) => [...prev, ...newPreviews]);
  };

  // Remove an existing screenshot (URL)
  const handleRemoveExistingScreenshot = (index: number) => {
    const updated = existingScreenshots.filter((_, i) => i !== index);
    setExistingScreenshots(updated);
  };

  // Remove a new screenshot (file + preview)
  const handleRemoveNewScreenshot = (index: number) => {
    setScreenshotFiles((prev) => prev.filter((_, i) => i !== index));
    setScreenshotPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // Normalize bucket env var
  const bucketId = process.env.NEXT_PUBLIC_STORAGE_BUCKET;
  if (typeof window !== 'undefined') {
    // nothing — just to quiet potential SSR complaints about process.env in Next
  }

  // Main submit handler: upload new files to Appwrite if any, then update Firestore
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.description) {
      alert('Please fill required fields: Title and Description.');
      return;
    }
    setIsSubmitting(true);
    setProgress(5);
    setUploadMessage('Preparing updates...');

    try {
      if (!bucketId) throw new Error('Missing NEXT_PUBLIC_STORAGE_BUCKET env var.');

      let finalImageUrl = formData.image; // start with existing
      const finalScreenshots: string[] = [...existingScreenshots]; // keep existing unless removed

      // 1) Upload main image if replaced
      if (imageFile) {
        setUploadMessage('Uploading main image...');
        setProgress(15);
        const url = await uploadToAppwrite(imageFile, bucketId);
        finalImageUrl = url;
        setProgress(40);
      }

      // 2) Upload any new screenshot files
      if (screenshotFiles.length > 0) {
        setUploadMessage('Uploading screenshots...');
        // upload sequentially to keep memory low and give incremental progress
        const perFile = Math.floor((60 - 40) / screenshotFiles.length);
        let cur = 40;
        for (const file of screenshotFiles) {
          const url = await uploadToAppwrite(file, bucketId);
          finalScreenshots.push(url);
          cur += perFile;
          setProgress(Math.min(cur, 85));
        }
        setProgress(85);
      }

      // 3) Prepare final doc payload
      const payload = {
        title: formData.title,
        description: formData.description,
        image: finalImageUrl,
        price: formData.price || '',
        os: formData.os || '',
        architecture: formData.architecture || '',
        rating: formData.rating || '',
        security: formData.security || '',
        screenshots: finalScreenshots,
        date: formData.date || new Date().toLocaleDateString(),
        updatedAt: serverTimestamp(),
      };

      setUploadMessage('Saving to Firestore...');
      setProgress(90);
      const docRef = doc(db, 'Windows-tools', id);
      await updateDoc(docRef, payload);

      setProgress(100);
      setUploadMessage('Done!');
      // small pause to show completion to user (no waiting for you — just immediate next steps)
      setTimeout(() => {
        router.push('/window');
      }, 600);
    } catch (err) {
      console.error('Update failed', err);
      alert('Update failed. Check console for details.');
    } finally {
      setIsSubmitting(false);
      setProgress(0);
      setUploadMessage(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-gray-300 text-center p-6">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3" />
          <div>Loading tool data...</div>
        </div>
      </div>
    );
  }

  return (
    <section
      className="min-h-screen flex items-start justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-black/80 to-red-900/50"
      style={{ backgroundImage: 'linear-gradient(45deg, rgba(255, 0, 0, 0.08), rgba(0,0,0,0.6))' }}
    >
      {/* Glow / Background shapes */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[420px] h-[420px] bg-red-600/12 blur-[160px] rounded-full animate-pulse" />
        <div className="absolute bottom-0 right-0 w-[420px] h-[420px] bg-purple-600/10 blur-[200px] rounded-full" />
      </div>

      <div className="edit-container relative w-full max-w-3xl mt-8 p-8 bg-black/40 backdrop-blur-md rounded-2xl shadow-2xl border border-red-800/20">
        <h2 className="text-3xl md:text-4xl font-extrabold text-red-500 text-center mb-6 tracking-wide">
          Edit Tool
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Progress bar */}
          {isSubmitting && (
            <div className="w-full bg-gray-700 rounded-full h-2.5 mb-2 overflow-hidden">
              <div
                className="h-2.5 bg-red-600 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
          {uploadMessage && (
            <p className="text-sm text-gray-300 mb-2">{uploadMessage} {isSubmitting && <Loader2 className="inline-block h-4 w-4 animate-spin ml-2" />}</p>
          )}

          {/* Title */}
          <div className="fade-item">
            <label className="block text-sm text-gray-300 mb-1">Tool Title</label>
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Enter Tool Title"
                className="w-full pl-10 pr-4 py-3 bg-black/30 border border-red-800/40 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600 transition-all duration-200 text-lg"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Description */}
          <div className="fade-item">
            <label className="block text-sm text-gray-300 mb-1">Description</label>
            <textarea
              name="description"
              value={formData.description || ''}
              onChange={handleChange}
              placeholder="Enter detailed description"
              className="w-full h-36 p-4 bg-black/30 border border-red-800/40 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-600 resize-y transition-all duration-200 text-base leading-relaxed"
              disabled={isSubmitting}
              // style (full text color + size) - user requested explicit control via classes above
            />
            <p className="text-xs text-gray-500 mt-1">Tip: use line breaks for paragraphs. Text color is light, font-size is base (16px).</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Image upload */}
            <div className="fade-item">
              <label className="block text-sm text-gray-300 mb-1">Tool Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                disabled={isSubmitting}
                className="w-full text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-red-600 file:text-white hover:file:bg-red-700"
              />
              {imagePreview ? (
                <div className="mt-3">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="h-40 w-full object-cover rounded-lg border border-gray-600 shadow-md"
                  />
                </div>
              ) : (
                <div className="mt-3 text-gray-400">No image set</div>
              )}
            </div>

            {/* Price */}
            <div className="fade-item">
              <label className="block text-sm text-gray-300 mb-1">Price</label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  placeholder="Free or ₦500"
                  className="w-full pl-10 pr-4 py-3 bg-black/30 border border-red-800/40 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600 transition-all duration-200 text-sm"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* OS select */}
            <div className="fade-item">
              <label className="block text-sm text-gray-300 mb-1">Operating System</label>
              <div className="relative">
                <Monitor className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <select
                  name="os"
                  value={formData.os}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 bg-black/30 border border-red-800/40 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-600 transition-all duration-200"
                  disabled={isSubmitting}
                >
                  <option value="">Select OS</option>
                  <option value="Windows 7">Windows 7</option>
                  <option value="Windows 8">Windows 8</option>
                  <option value="Windows 10">Windows 10</option>
                  <option value="Windows 11">Windows 11</option>
                  <option value="Linux">Linux</option>
                </select>
              </div>
            </div>

            {/* Architecture select */}
            <div className="fade-item">
              <label className="block text-sm text-gray-300 mb-1">Architecture</label>
              <div className="relative">
                <Cpu className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <select
                  name="architecture"
                  value={formData.architecture}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 bg-black/30 border border-red-800/40 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-600 transition-all duration-200"
                  disabled={isSubmitting}
                >
                  <option value="">Select architecture</option>
                  <option value="32 bit">32 bit</option>
                  <option value="64 bit">64 bit</option>
                  <option value="32/64 bit">32 bit / 64 bit</option>
                  <option value="ARM">ARM</option>
                </select>
              </div>
            </div>

            {/* Rating */}
            <div className="fade-item">
              <label className="block text-sm text-gray-300 mb-1">Rating</label>
              <div className="relative">
                <Star className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <select
                  name="rating"
                  value={formData.rating}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 bg-black/30 border border-red-800/40 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-600 transition-all duration-200"
                  disabled={isSubmitting}
                >
                  <option value="">Select rating</option>
                  <option value="0.5/1">0.5/1</option>
                  <option value="1.5/2">1.5/2</option>
                  <option value="2.5/3">2.5/3</option>
                  <option value="3.5/4">3.5/4</option>
                  <option value="4.5/5">4.5/5</option>
                </select>
              </div>
            </div>

            {/* Security */}
            <div className="fade-item">
              <label className="block text-sm text-gray-300 mb-1">Security</label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <select
                  name="security"
                  value={formData.security}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 bg-black/30 border border-red-800/40 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-600 transition-all duration-200"
                  disabled={isSubmitting}
                >
                  <option value="">Select security level</option>
                  <option value="safe">Safe</option>
                  <option value="medium">Medium Risk</option>
                  <option value="high">High Risk</option>
                </select>
              </div>
            </div>
          </div>

          {/* Screenshots upload area */}
          <div className="fade-item">
            <label className="block text-sm text-gray-300 mb-2">Screenshots</label>

            <div
              ref={dropRef}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="border-2 border-dashed border-red-800/40 p-4 rounded-lg bg-black/20 hover:bg-black/30 transition-colors duration-200"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-gray-300">
                  <Upload className="h-5 w-5" />
                  <div>
                    <div className="text-sm">Drag & drop images here or click to upload</div>
                    <div className="text-xs text-gray-400">PNG/JPG, resized automatically</div>
                  </div>
                </div>
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleScreenshotsChange}
                    disabled={isSubmitting}
                    className="hidden"
                    id="screenshot-input"
                  />
                  <label htmlFor="screenshot-input" className="px-3 py-2 bg-red-600 text-white rounded-lg cursor-pointer text-sm">
                    Browse
                  </label>
                </div>
              </div>
            </div>

            {/* Show previews: existing screenshots (URLs) */}
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
              {existingScreenshots.map((url, idx) => (
                <div key={`existing-${idx}`} className="relative group">
                  <img src={url} alt={`screenshot-${idx}`} className="h-28 w-full object-cover rounded-lg border border-gray-600 shadow-sm" />
                  <button
                    type="button"
                    onClick={() => handleRemoveExistingScreenshot(idx)}
                    className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    disabled={isSubmitting}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                </div>
              ))}

              {/* new screenshot previews */}
              {screenshotPreviews.map((preview, idx) => (
                <div key={`new-${idx}`} className="relative group">
                  <img src={preview} alt={`new-${idx}`} className="h-28 w-full object-cover rounded-lg border border-gray-600 shadow-sm" />
                  <button
                    type="button"
                    onClick={() => handleRemoveNewScreenshot(idx)}
                    className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    disabled={isSubmitting}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setScreenshotFiles([]);
                  setScreenshotPreviews([]);
                }}
                className="px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
                disabled={isSubmitting || (screenshotFiles.length === 0 && screenshotPreviews.length === 0)}
              >
                Clear New Screenshots
              </button>

              <button
                type="button"
                onClick={() => {
                  setExistingScreenshots([]);
                }}
                className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                disabled={isSubmitting || existingScreenshots.length === 0}
              >
                Remove All Existing
              </button>
            </div>
          </div>

          {/* Release Date */}
          <div className="fade-item">
            <label className="block text-sm text-gray-300 mb-1">Release Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                name="date"
                value={formData.date}
                onChange={handleChange}
                placeholder="Oct 08, 2025"
                className="w-full pl-10 pr-4 py-3 bg-black/30 border border-red-800/40 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600 transition-all duration-200"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Submit */}
          <div className="fade-item">
            <button
              type="submit"
              disabled={isSubmitting || !formData.title || !formData.description}
              className="w-full py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center gap-2 font-semibold shadow-md hover:shadow-lg transition-all duration-200 disabled:bg-gray-500 disabled:cursor-not-allowed text-lg"
            >
              {isSubmitting && <Loader2 className="h-5 w-5 animate-spin" />}
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
};

export default EditWindowPage;