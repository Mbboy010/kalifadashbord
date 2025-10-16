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
  Link,
  Type,
  Bold,
} from 'lucide-react';
import { gsap } from 'gsap';
import { useRouter, useParams } from 'next/navigation';
import { db } from '@/server/firebaseApi';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { storage } from '@/server/appwrite';
import { v4 as uuidv4 } from 'uuid';

interface ToolForm {
  id: string;
  title: string;
  description: string;
  image: string;
  downloadFile?: File | null;
  downloadUrl: string | null;
  downloads: number;
  priceType: 'Free' | 'Paid';
  price: number | null;
  os: string;
  architecture: string;
  date: string;
  rating: string;
  security: string;
  screenshots: string[];
  size: string;
  downloadType: 'file' | 'link';
}

const cropAndResizeImage = (file: File, maxSize = 500): Promise<File> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (e) => (img.src = e.target?.result as string);
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
        (blob) => (blob ? resolve(new File([blob], file.name.replace(/\.[^/.]+$/, '') + '.png', { type: 'image/png' })) : reject(new Error('Canvas toBlob returned null'))),
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
    reader.onload = (e) => (img.src = e.target?.result as string);
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
      if (ctx) ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => (blob ? resolve(new File([blob], file.name.replace(/\.[^/.]+$/, '') + '.png', { type: 'image/png' })) : reject(new Error('Canvas toBlob returned null'))),
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
  const uploaded = await storage.createFile(bucketId, 'unique()', file);
  return toUrlString(storage.getFileDownload(bucketId, uploaded.$id));
};

// Convert tags to HTML
const convertToHtml = (text: string): string => {
  let result = text;
  const tagPairs = [
    { open: /\[center\](.*?)\[\/center\]/g, replace: '<div class="text-center">$1</div>' },
    { open: /\[underline\](.*?)\[\/underline\]/g, replace: '<span class="underline">$1</span>' },
    { open: /\[bold\](.*?)\[\/bold\]/g, replace: '<span class="font-bold">$1</span>' },
    { open: /\[size=sm\](.*?)\[\/size\]/g, replace: '<span class="text-sm">$1</span>' },
    { open: /\[size=md\](.*?)\[\/size\]/g, replace: '<span class="text-base">$1</span>' },
    { open: /\[size=lg\](.*?)\[\/size\]/g, replace: '<span class="text-lg">$1</span>' },
    { open: /\[color=red\](.*?)\[\/color\]/g, replace: '<span class="text-red-500">$1</span>' },
    { open: /\[color=green\](.*?)\[\/color\]/g, replace: '<span class="text-green-500">$1</span>' },
    { open: /\[color=blue\](.*?)\[\/color\]/g, replace: '<span class="text-blue-500">$1</span>' },
    { open: /\[link href="([^"]+)"\](.*?)\[\/link\]/g, replace: '<a href="$1" class="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">$2</a>' },
  ];
  const selfClosingTags = [/\[bar\/\]/g];

  // Process paired tags
  for (const { open, replace } of tagPairs) {
    result = result.replace(open, replace);
  }

  // Process self-closing tags
  for (const tag of selfClosingTags) {
    result = result.replace(tag, '<hr class="border-t border-gray-600 my-2"/>');
  }

  // Replace newlines
  result = result.replace(/\n\n/g, '<br/><br/>');

  // Remove any unprocessed tags
  result = result.replace(/\[\/?[a-zA-Z0-9= "]*\]/g, '');

  return result;
};

// ✅ Improved robust validator
const validateDescription = (text: string): boolean => {
  // Define supported tags
  const pairedTags = ["center", "underline", "bold", "size", "color", "link"];
  const selfClosingTags = ["bar"];

  // Match all tags like [tag], [tag=val], [tag attr="val"], [/tag], [tag/]
  const tagPattern = /\[\/?[a-zA-Z]+(?:=[^\]]+)?(?: [^\]]+)?\/?\]/g;
  const tags = text.match(tagPattern) || [];
  const stack: string[] = [];

  for (const tag of tags) {
    // ✅ Self-closing tag, like [bar/]
    const selfCloseMatch = tag.match(/^\[([a-zA-Z]+)\/\]$/);
    if (selfCloseMatch) {
      const tagName = selfCloseMatch[1];
      if (!selfClosingTags.includes(tagName)) return false;
      continue;
    }

    // ✅ Opening tag (with or without attributes)
    const openMatch = tag.match(/^\[([a-zA-Z]+)(?:=[^\]]+)?(?: [^\]]+)?\]$/);
    if (openMatch) {
      const tagName = openMatch[1];
      if (!pairedTags.includes(tagName)) return false;
      stack.push(tagName);
      continue;
    }

    // ✅ Closing tag like [/center], [/size], [/color], [/link]
    const closeMatch = tag.match(/^\[\/([a-zA-Z]+)\]$/);
    if (closeMatch) {
      const tagName = closeMatch[1];
      if (!pairedTags.includes(tagName)) return false;

      // Check matching opening tag
      const lastOpen = stack.pop();
      if (lastOpen !== tagName) {
        return false; // Mismatched nesting
      }
    }
  }

  // ✅ Must close all tags
  return stack.length === 0;
};

const EditWindowPage: React.FC = () => {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [formData, setFormData] = useState<ToolForm>({
    id: '',
    title: '',
    description: '',
    image: '',
    downloadFile: null,
    downloadUrl: null,
    downloads: 0,
    priceType: 'Free',
    price: null,
    os: '',
    architecture: '',
    date: new Date().toISOString(),
    rating: '',
    security: '',
    screenshots: [],
    size: '',
    downloadType: 'file',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [downloadFile, setDownloadFile] = useState<File | null>(null);
  const [screenshotFiles, setScreenshotFiles] = useState<File[]>([]);
  const [screenshotPreviews, setScreenshotPreviews] = useState<string[]>([]);
  const [existingScreenshots, setExistingScreenshots] = useState<string[]>([]);
  const [linkUrl, setLinkUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const dropRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const fetchApp = async () => {
      try {
        if (!id) return;
        const docRef = doc(db, 'Windows-tools', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as ToolForm;
          setFormData({
            id: docSnap.id,
            title: data.title || '',
            description: data.description || '',
            image: data.image || '',
            downloadFile: null,
            downloadUrl: data.downloadUrl || null,
            downloads: data.downloads || 0,
            priceType: data.priceType || 'Free',
            price: data.price || null,
            os: data.os || '',
            architecture: data.architecture || '',
            date: data.date || new Date().toISOString(),
            rating: data.rating || '',
            security: data.security || '',
            screenshots: data.screenshots || [],
            size: data.size || '',
            downloadType: data.downloadType || 'file',
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

  useEffect(() => {
    if (!loading) {
      gsap.from('.edit-container', { opacity: 0, y: 50, duration: 0.8, ease: 'power3.out' });
      gsap.from('.fade-item', { opacity: 0, y: 20, duration: 0.6, stagger: 0.06, delay: 0.1, ease: 'power3.out' });
    }
  }, [loading]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDownloadTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as 'file' | 'link';
    setFormData((prev) => ({
      ...prev,
      downloadType: value,
      downloadFile: value === 'file' ? prev.downloadFile : null,
      downloadUrl: value === 'link' ? prev.downloadUrl : null,
    }));
  };

  const handleDownloadUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, downloadUrl: e.target.value }));
  };

  const handleSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, size: e.target.value }));
  };

  const handleDescriptionLinkUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLinkUrl(e.target.value);
  };

  const applyTextFormat = (
    format: 'center' | 'underline' | 'bold' | 'size=sm' | 'size=md' | 'size=lg' | 'color=red' | 'color=green' | 'color=blue' | 'paragraph' | 'link' | 'bar'
  ) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = formData.description.substring(start, end);
    let newText = formData.description;

    if (format === 'paragraph') {
      newText = `${newText.substring(0, start)}\n\n${newText.substring(end)}`;
    } else if (format === 'link') {
      if (!linkUrl) {
        alert('Please enter a valid URL for the link.');
        return;
      }
      if (!/^https?:\/\/[^\s/$.?#].[^\s]*$/.test(linkUrl)) {
        alert('Please enter a valid URL starting with http:// or https://');
        return;
      }
      if (selectedText) {
        newText = `${newText.substring(0, start)}[link href="${linkUrl}"]${selectedText}[/link]${newText.substring(end)}`;
      } else {
        newText = `${newText.substring(0, start)}[link href="${linkUrl}"]Click here[/link]${newText.substring(end)}`;
        textarea.selectionStart = start + 13 + linkUrl.length;
        textarea.selectionEnd = start + 13 + linkUrl.length + 10;
      }
      setLinkUrl('');
    } else if (format === 'bar') {
      newText = `${newText.substring(0, start)}[bar/]${newText.substring(end)}`;
      textarea.selectionStart = start + 6;
      textarea.selectionEnd = start + 6;
    } else if (format.startsWith('color=') || format.startsWith('size=')) {
      if (selectedText) {
        newText = `${newText.substring(0, start)}[${format}]${selectedText}[/${format.split('=')[0]}]${newText.substring(end)}`;
      } else {
        newText = `${newText.substring(0, start)}[${format}][/${format.split('=')[0]}]${newText.substring(end)}`;
        textarea.selectionStart = start + format.length + 2;
        textarea.selectionEnd = start + format.length + 2;
      }
    } else {
      if (selectedText) {
        newText = `${newText.substring(0, start)}[${format}]${selectedText}[/${format}]${newText.substring(end)}`;
      } else {
        newText = `${newText.substring(0, start)}[${format}][/${format}]${newText.substring(end)}`;
        textarea.selectionStart = start + format.length + 2;
        textarea.selectionEnd = start + format.length + 2;
      }
    }

    setFormData((prev) => ({ ...prev, description: newText }));
    textarea.focus();
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      const cropped = await cropAndResizeImage(file, 500);
      setImageFile(cropped);
      setImagePreview(URL.createObjectURL(cropped));
    }
  };

  const handleDownloadFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      if (!/\.(zip|exe)$/i.test(file.name)) {
        alert('Only .zip or .exe files are allowed!');
        return;
      }
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
      setDownloadFile(file);
      setFormData((prev) => ({ ...prev, size: sizeMB }));
    }
  };

  const handleScreenshotsChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length) {
      const resized = await Promise.all(files.map((f) => resizeImage(f, 800)));
      setScreenshotFiles((prev) => [...prev, ...resized]);
      setScreenshotPreviews((prev) => [...prev, ...resized.map((f) => URL.createObjectURL(f))]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault();
  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith('image/'));
    if (files.length) {
      const resized = await Promise.all(files.map((f) => resizeImage(f, 800)));
      setScreenshotFiles((prev) => [...prev, ...resized]);
      setScreenshotPreviews((prev) => [...prev, ...resized.map((f) => URL.createObjectURL(f))]);
    }
  };

  const handleRemoveExistingScreenshot = (index: number) => {
    setExistingScreenshots((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveNewScreenshot = (index: number) => {
    setScreenshotFiles((prev) => prev.filter((_, i) => i !== index));
    setScreenshotPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.description || !formData.image) {
      alert('Please fill required fields: Title, Description, and Image.');
      return;
    }
    if (!validateDescription(formData.description)) {
      alert('Unbalanced formatting tags in description. Please check [center], [underline], [bold], [size], [color], [link], and [bar/] tags.');
      return;
    }
    setIsSubmitting(true);
    setProgress(5);
    setUploadMessage('Preparing updates...');

    try {
      const bucketId = process.env.NEXT_PUBLIC_STORAGE_BUCKET;
      if (!bucketId) throw new Error('Missing NEXT_PUBLIC_STORAGE_BUCKET env var.');

      let finalImageUrl = formData.image;
      let finalDownloadUrl = formData.downloadUrl;
      const finalScreenshots: string[] = [...existingScreenshots];

      if (imageFile) {
        setUploadMessage('Uploading main image...');
        setProgress(15);
        finalImageUrl = await uploadToAppwrite(imageFile, bucketId);
        setProgress(40);
      }

      if (downloadFile && formData.downloadType === 'file') {
        setUploadMessage('Uploading download file...');
        finalDownloadUrl = await uploadToAppwrite(downloadFile, bucketId);
        setProgress(60);
      } else if (formData.downloadType === 'link' && formData.downloadUrl) {
        finalDownloadUrl = formData.downloadUrl;
      }

      if (screenshotFiles.length > 0) {
        setUploadMessage('Uploading screenshots...');
        const perFile = Math.floor((80 - 60) / screenshotFiles.length);
        let cur = 60;
        for (const file of screenshotFiles) {
          const url = await uploadToAppwrite(file, bucketId);
          finalScreenshots.push(url);
          cur += perFile;
          setProgress(Math.min(cur, 80));
        }
        setProgress(80);
      }

      const htmlDescription = convertToHtml(formData.description);

      const payload = {
        title: formData.title,
        description: htmlDescription,
        image: finalImageUrl,
        downloadUrl: finalDownloadUrl,
        downloads: formData.downloads,
        priceType: formData.priceType,
        price: formData.priceType === 'Paid' ? formData.price ?? 0 : 0,
        os: formData.os,
        architecture: formData.architecture,
        date: formData.date,
        rating: formData.rating,
        security: formData.security,
        screenshots: finalScreenshots,
        size: formData.size,
        downloadType: formData.downloadType,
        updatedAt: serverTimestamp(),
      };

      setUploadMessage('Saving to Firestore...');
      setProgress(90);
      const docRef = doc(db, 'Windows-tools', id);
      await updateDoc(docRef, payload);

      setProgress(100);
      setUploadMessage('Done!');
      setTimeout(() => router.push(`/windows-tools/${formData.id}`), 600);
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
    >
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[420px] h-[420px] bg-red-600/12 blur-[160px] rounded-full animate-pulse" />
        <div className="absolute bottom-0 right-0 w-[420px] h-[420px] bg-purple-600/10 blur-[200px] rounded-full" />
      </div>

      <div className="edit-container relative w-full max-w-3xl mt-8  bg-black/40 backdrop-blur-md rounded-2xl shadow-2xl border border-red-800/20">
        <h2 className="text-3xl md:text-4xl font-extrabold text-red-500 text-center mb-6 tracking-wide">Edit Tool</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {isSubmitting && (
            <div className="w-full bg-gray-700 rounded-full h-2.5 mb-2 overflow-hidden">
              <div className="h-2.5 bg-red-600 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          )}
          {uploadMessage && <p className="text-sm text-gray-300 mb-2">{uploadMessage} {isSubmitting && <Loader2 className="inline-block h-4 w-4 animate-spin ml-2" />}</p>}

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

          <div className="fade-item">
            <label className="block text-sm text-gray-300 mb-1">Description</label>
            <div className="flex flex-wrap gap-2 mb-2">
              <button type="button" onClick={() => applyTextFormat('center')} className="px-2 py-1 bg-gray-700 text-white rounded hover:bg-gray-600" title="Center Text">Center</button>
              <button type="button" onClick={() => applyTextFormat('underline')} className="px-2 py-1 bg-gray-700 text-white rounded hover:bg-gray-600" title="Underline Text">Underline</button>
              <button type="button" onClick={() => applyTextFormat('bold')} className="px-2 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 flex items-center gap-1" title="Bold Text"><Bold className="h-4 w-4" />Bold</button>
              <button type="button" onClick={() => applyTextFormat('size=sm')} className="px-2 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 flex items-center gap-1" title="Small Text"><Type className="h-4 w-4" />Small</button>
              <button type="button" onClick={() => applyTextFormat('size=md')} className="px-2 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 flex items-center gap-1" title="Medium Text"><Type className="h-4 w-4" />Medium</button>
              <button type="button" onClick={() => applyTextFormat('size=lg')} className="px-2 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 flex items-center gap-1" title="Large Text"><Type className="h-4 w-4" />Large</button>
              <button type="button" onClick={() => applyTextFormat('color=red')} className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700" title="Red Text">Red</button>
              <button type="button" onClick={() => applyTextFormat('color=green')} className="px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700" title="Green Text">Green</button>
              <button type="button" onClick={() => applyTextFormat('color=blue')} className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700" title="Blue Text">Blue</button>
              <button type="button" onClick={() => applyTextFormat('paragraph')} className="px-2 py-1 bg-gray-700 text-white rounded hover:bg-gray-600" title="Add Paragraph Break">Paragraph</button>
              <button type="button" onClick={() => applyTextFormat('bar')} className="px-2 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 flex items-center gap-1" title="Add Horizontal Rule"><Minus className="h-4 w-4" />HR</button>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={linkUrl}
                  onChange={handleDescriptionLinkUrlChange}
                  placeholder="Enter link URL"
                  className="px-2 py-1 bg-black/30 border border-red-800/40 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600"
                  disabled={isSubmitting}
                />
                <button type="button" onClick={() => applyTextFormat('link')} className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1" title="Add Link"><Link className="h-4 w-4" />Add Link</button>
              </div>
            </div>
            <textarea
              ref={textareaRef}
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Enter description with [center], [underline], [bold], [size=sm], [size=md], [size=lg], [color=red], [color=green], [color=blue], [link href='URL']text[/link], [bar/] tags"
              className="w-full h-36 p-4 bg-black/30 border border-red-800/40 rounded-lg text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-600 resize-y transition-all duration-200 text-base leading-relaxed"
              disabled={isSubmitting}
            />
            <div className="mt-4">
              <h3 className="text-sm text-gray-300 mb-2">Preview</h3>
              <div className="text-white prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: convertToHtml(formData.description) }} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="fade-item">
              <label className="block text-sm text-gray-300 mb-1">Tool Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                disabled={isSubmitting}
                className="w-full text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-red-600 file:text-white hover:file:bg-red-700"
              />
              {imagePreview && (
                <div className="mt-3">
                  <img src={imagePreview} alt="Preview" className="h-40 w-full object-cover rounded-lg border border-gray-600 shadow-md" />
                </div>
              )}
            </div>

            <div className="fade-item">
              <label className="block text-sm text-gray-300 mb-1">Download Type</label>
              <select
                name="downloadType"
                value={formData.downloadType}
                onChange={handleDownloadTypeChange}
                disabled={isSubmitting}
                className="w-full p-3 bg-black/30 border border-red-800/40 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-600 transition-all duration-200"
              >
                <option value="file">File</option>
                <option value="link">Link</option>
              </select>
            </div>

            {formData.downloadType === 'file' && (
              <div className="fade-item">
                <label className="block text-sm text-gray-300 mb-1">Upload File (.zip or .exe)</label>
                <input
                  type="file"
                  accept=".zip,.exe"
                  onChange={handleDownloadFileChange}
                  disabled={isSubmitting}
                  className="w-full text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-red-600 file:text-white hover:file:bg-red-700"
                />
                {formData.size && <p className="text-sm text-gray-300 mt-1">Size: {formData.size}</p>}
              </div>
            )}
            {formData.downloadType === 'link' && (
              <div className="fade-item">
                <label className="block text-sm text-gray-300 mb-1">Download URL</label>
                <div className="relative">
                  <Link className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    name="downloadUrl"
                    value={formData.downloadUrl || ''}
                    onChange={handleDownloadUrlChange}
                    placeholder="Enter download URL"
                    className="w-full pl-10 pr-4 py-3 bg-black/30 border border-red-800/40 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600 transition-all duration-200"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            )}
            {formData.downloadType === 'link' && (
              <div className="fade-item">
                <label className="block text-sm text-gray-300 mb-1">Size (MB)</label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    name="size"
                    value={formData.size}
                    onChange={handleSizeChange}
                    placeholder="e.g., 10.5 MB"
                    className="w-full pl-10 pr-4 py-3 bg-black/30 border border-red-800/40 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600 transition-all duration-200"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            )}

            <div className="fade-item">
              <label className="block text-sm text-gray-300 mb-1">Price Type</label>
              <select
                name="priceType"
                value={formData.priceType}
                onChange={handleChange}
                disabled={isSubmitting}
                className="w-full p-3 bg-black/30 border border-red-800/40 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-600 transition-all duration-200"
              >
                <option value="Free">Free</option>
                <option value="Paid">Paid</option>
              </select>
            </div>

            {formData.priceType === 'Paid' && (
              <div className="fade-item">
                <label className="block text-sm text-gray-300 mb-1">Price (₦)</label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="number"
                    name="price"
                    value={formData.price ?? ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, price: Number(e.target.value) || null }))}
                    placeholder="Enter price"
                    className="w-full pl-10 pr-4 py-3 bg-black/30 border border-red-800/40 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600 transition-all duration-200"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            )}

            <div className="fade-item">
              <label className="block text-sm text-gray-300 mb-1">Operating System</label>
              <div className="relative">
                <Monitor className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  name="os"
                  value={formData.os}
                  onChange={handleChange}
                  placeholder="e.g., Windows 7/8/10/11"
                  className="w-full pl-10 pr-4 py-3 bg-black/30 border border-red-800/40 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600 transition-all duration-200"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="fade-item">
              <label className="block text-sm text-gray-300 mb-1">Architecture</label>
              <div className="relative">
                <Cpu className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <select
                  name="architecture"
                  value={formData.architecture}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  className="w-full pl-10 pr-4 py-3 bg-black/30 border border-red-800/40 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-600 transition-all duration-200"
                >
                  <option value="">Select architecture</option>
                  <option value="32 bit">32 bit</option>
                  <option value="64 bit">64 bit</option>
                  <option value="32 bit / 64 bit">32 bit / 64 bit</option>
                  <option value="arm">ARM</option>
                </select>
              </div>
            </div>

            <div className="fade-item">
              <label className="block text-sm text-gray-300 mb-1">Rating</label>
              <div className="relative">
                <Star className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <select
                  name="rating"
                  value={formData.rating}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  className="w-full pl-10 pr-4 py-3 bg-black/30 border border-red-800/40 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-600 transition-all duration-200"
                >
                  <option value="">Select rating</option>
                  <option value="0.5/5">0.5/5</option>
                  <option value="1.5/5">1.5/5</option>
                  <option value="2.5/5">2.5/5</option>
                  <option value="3.5/5">3.5/5</option>
                  <option value="4.5/5">4.5/5</option>
                </select>
              </div>
            </div>

            <div className="fade-item">
              <label className="block text-sm text-gray-300 mb-1">Security</label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <select
                  name="security"
                  value={formData.security}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  className="w-full pl-10 pr-4 py-3 bg-black/30 border border-red-800/40 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-600 transition-all duration-200"
                >
                  <option value="">Select security level</option>
                  <option value="safe">Safe</option>
                  <option value="medium">Medium Risk</option>
                  <option value="high">High Risk</option>
                </select>
              </div>
            </div>
          </div>

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
                onClick={() => { setScreenshotFiles([]); setScreenshotPreviews([]); }}
                className="px-3 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
                disabled={isSubmitting || (screenshotFiles.length === 0 && screenshotPreviews.length === 0)}
              >
                Clear New Screenshots
              </button>
              <button
                type="button"
                onClick={() => setExistingScreenshots([])}
                className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                disabled={isSubmitting || existingScreenshots.length === 0}
              >
                Remove All Existing
              </button>
            </div>
          </div>

          <div className="fade-item">
            <button
              type="submit"
              disabled={isSubmitting || !formData.title || !formData.description || !formData.image || (formData.downloadType === 'file' && !downloadFile) || (formData.downloadType === 'link' && !formData.downloadUrl)}
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