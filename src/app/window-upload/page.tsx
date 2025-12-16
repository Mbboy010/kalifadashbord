'use client';

import { useState, useEffect, useRef } from 'react';
import { Minus, Tag, Monitor, Cpu, Shield, Star, Loader2, Calendar, Link, Type, Bold } from 'lucide-react';
import { gsap } from 'gsap';
import { db } from '@/server/firebaseApi';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { storage } from '@/server/appwrite';
import { v4 as uuidv4 } from 'uuid';

interface ToolForm {
  title: string;
  description: string;
  downloads: number;
  image: File | null;
  downloadFile: File | null;
  downloadUrl: string | null;
  priceType: 'Free' | 'Paid';
  price: number | null;
  os: string;
  architecture: string;
  date: string;
  rating: string;
  security: string;
  screenshots: File[];
  size: string;
  downloadType: 'file' | 'link';
}

// Crop and resize image before upload (main tool image only, force PNG)
const cropAndResizeImage = (file: File, maxSize = 500): Promise<File> => {
  return new Promise((resolve) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };

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
          }
        },
        'image/png',
        1.0
      );
    };

    reader.readAsDataURL(file);
  });
};

// Resize proportionally (for screenshots only, force PNG)
const resizeImage = (file: File, maxSize = 800): Promise<File> => {
  return new Promise((resolve) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };

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
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
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
          }
        },
        'image/png',
        1.0
      );
    };

    reader.readAsDataURL(file);
  });
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
  const pairedTags = ["center", "underline", "bold", "size", "color", "link"];
  const selfClosingTags = ["bar"];

  const tagPattern = /\[\/?[a-zA-Z]+(?:=[^\]]+)?(?: [^\]]+)?\/?\]/g;
  const tags = text.match(tagPattern) || [];
  const stack: string[] = [];

  for (const tag of tags) {
    const selfCloseMatch = tag.match(/^\[([a-zA-Z]+)\/\]$/);
    if (selfCloseMatch) {
      const tagName = selfCloseMatch[1];
      if (!selfClosingTags.includes(tagName)) return false;
      continue;
    }

    const openMatch = tag.match(/^\[([a-zA-Z]+)(?:=[^\]]+)?(?: [^\]]+)?\]$/);
    if (openMatch) {
      const tagName = openMatch[1];
      if (!pairedTags.includes(tagName)) return false;
      stack.push(tagName);
      continue;
    }

    const closeMatch = tag.match(/^\[\/([a-zA-Z]+)\]$/);
    if (closeMatch) {
      const tagName = closeMatch[1];
      if (!pairedTags.includes(tagName)) return false;

      const lastOpen = stack.pop();
      if (lastOpen !== tagName) {
        return false;
      }
    }
  }

  return stack.length === 0;
};

const UploadToolPage: React.FC = () => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [formData, setFormData] = useState<ToolForm>({
    title: '',
    description: '',
    image: null,
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [linkUrl, setLinkUrl] = useState('');

  // Handle text/select inputs
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle download type change
  const handleDownloadTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as 'file' | 'link';
    setFormData((prev) => ({
      ...prev,
      downloadType: value,
      downloadFile: value === 'file' ? prev.downloadFile : null,
      downloadUrl: value === 'link' ? prev.downloadUrl : null,
    }));
  };

  // Handle link URL input for description formatting
  const handleDescriptionLinkUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLinkUrl(e.target.value);
  };

  // Handle download URL input
  const handleDownloadUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, downloadUrl: e.target.value }));
  };

  // Handle size input
  const handleSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, size: e.target.value }));
  };

  // Handle text formatting for description
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

  // Handle file uploads
  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: keyof ToolForm
  ) => {
    const file = e.target.files?.[0] || null;

    if (field === 'downloadFile' && file) {
      if (!/\.(zip|exe)$/i.test(file.name)) {
        alert('Only .zip or .exe files are allowed!');
        return;
      }
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
      setFormData((prev) => ({ ...prev, [field]: file, size: sizeMB }));
    } else if (field === 'image' && file) {
      const cropped = await cropAndResizeImage(file, 500);
      setFormData((prev) => ({ ...prev, image: cropped }));
    } else if (field === 'screenshots') {
      const files = e.target.files ? Array.from(e.target.files) : [];
      const resizedFiles = await Promise.all(files.map((f) => resizeImage(f, 800)));
      setFormData((prev) => ({ ...prev, screenshots: [...prev.screenshots, ...resizedFiles] }));
    }
  };

  // Remove screenshot
  const handleRemoveScreenshot = (index: number) => {
    const newScreenshots = formData.screenshots.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, screenshots: newScreenshots }));
  };

  // Drag & drop (screenshots only, resize no crop)
  const handleDragOver = (e: React.DragEvent<HTMLDivElement> | React.DragEvent<HTMLLabelElement>) => e.preventDefault();
  
  const handleDrop = async (e: React.DragEvent<HTMLDivElement> | React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const resizedFiles = await Promise.all(files.map((f) => resizeImage(f, 800)));
    setFormData((prev) => ({ ...prev, screenshots: [...prev.screenshots, ...resizedFiles] }));
  };

  // Normalize Appwrite download URL
  const toUrlString = (u: any): string => {
    if (!u) return '';
    if (typeof u === 'string') return u;
    if (typeof u?.toString === 'function') return u.toString();
    if (u?.href) return u.href;
    return String(u);
  };

  // Upload to Appwrite
  const uploadToAppwrite = async (file: File, bucketId: string) => {
    const uploaded = await storage.createFile(bucketId, 'unique()', file);
    const url = storage.getFileDownload(bucketId, uploaded.$id);
    return toUrlString(url);
  };

  // Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.description || !formData.image) {
      alert('Please fill all required fields');
      return;
    }
    if (!validateDescription(formData.description)) {
      alert('Unbalanced formatting tags in description. Please check [center], [underline], [bold], [size], [color], [link], and [bar/] tags.');
      return;
    }

    setIsSubmitting(true);
    setProgress(10);

    try {
      const bucketId = process.env.NEXT_PUBLIC_STORAGE_BUCKET;
      if (!bucketId) throw new Error('Missing NEXT_PUBLIC_STORAGE_BUCKET env var.');

      const uniqueId = uuidv4();
      const safeTitleForId = formData.title.replace(/\//g, '_').replace(/\s+/g, '_').trim();
      const docId = `${safeTitleForId}_${uniqueId}`;

      const imageUrl = formData.image ? await uploadToAppwrite(formData.image, bucketId) : null;
      setProgress(40);

      let downloadUrl = null;
      if (formData.downloadType === 'file' && formData.downloadFile) {
        downloadUrl = await uploadToAppwrite(formData.downloadFile, bucketId);
      } else if (formData.downloadType === 'link' && formData.downloadUrl) {
        downloadUrl = formData.downloadUrl;
      }
      setProgress(70);

      const screenshotUrls: string[] = [];
      for (const file of formData.screenshots) {
        const url = await uploadToAppwrite(file, bucketId);
        screenshotUrls.push(url);
      }
      setProgress(90);

      const htmlDescription = convertToHtml(formData.description);

      await setDoc(doc(db, 'Windows-tools', docId), {
        id: docId,
        downloads: 0,
        title: formData.title,
        description: htmlDescription,
        image: imageUrl ?? null,
        downloadUrl: downloadUrl ?? null,
        priceType: formData.priceType,
        price: formData.priceType === 'Paid' ? formData.price ?? 0 : 0,
        os: formData.os || '',
        architecture: formData.architecture || '',
        date: formData.date,
        rating: formData.rating || '',
        security: formData.security || '',
        screenshots: screenshotUrls,
        size: formData.size || '',
        createdAt: serverTimestamp(),
      });

      setProgress(100);
      alert('Tool uploaded successfully!');
      setFormData({
        title: '',
        description: '',
        downloads: 0,
        image: null,
        downloadFile: null,
        downloadUrl: null,
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
      setLinkUrl('');
    } catch (err) {
      console.error(err);
      alert('Upload failed!');
    } finally {
      setIsSubmitting(false);
      setProgress(0);
    }
  };

  // Animation
  useEffect(() => {
    gsap.from('.upload-container', {
      opacity: 0,
      y: 50,
      duration: 0.8,
      ease: 'power3.out',
    });
  }, []);

  return (
    <section className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-900/20 to-black/50">
      <div className="upload-container mt-16 w-full max-w-3xl p-8 bg-black/40 backdrop-blur-md rounded-2xl shadow-2xl border border-red-800/20">
        <h2 className="text-3xl font-bold text-red-500 text-center mb-8 tracking-wide">Upload New Tool</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Title */}
            <div className="relative">
              <label className="block text-sm text-gray-300 mb-1">Tool Title</label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Enter Tool Title"
                  className="w-full pl-10 pr-4 py-3 bg-black/30 border border-red-800/40 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600 transition-all duration-200"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Description with Formatting Toolbar */}
            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm text-gray-300 mb-1">Description</label>
              <div className="flex flex-wrap gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => applyTextFormat('center')}
                  className="px-2 py-1 bg-gray-700 text-white rounded hover:bg-gray-600"
                  title="Center Text"
                >
                  Center
                </button>
                <button
                  type="button"
                  onClick={() => applyTextFormat('underline')}
                  className="px-2 py-1 bg-gray-700 text-white rounded hover:bg-gray-600"
                  title="Underline Text"
                >
                  Underline
                </button>
                <button
                  type="button"
                  onClick={() => applyTextFormat('bold')}
                  className="px-2 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 flex items-center gap-1"
                  title="Bold Text"
                >
                  <Bold className="h-4 w-4" />
                  Bold
                </button>
                <button
                  type="button"
                  onClick={() => applyTextFormat('size=sm')}
                  className="px-2 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 flex items-center gap-1"
                  title="Small Text"
                >
                  <Type className="h-4 w-4" />
                  Small
                </button>
                <button
                  type="button"
                  onClick={() => applyTextFormat('size=md')}
                  className="px-2 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 flex items-center gap-1"
                  title="Medium Text"
                >
                  <Type className="h-4 w-4" />
                  Medium
                </button>
                <button
                  type="button"
                  onClick={() => applyTextFormat('size=lg')}
                  className="px-2 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 flex items-center gap-1"
                  title="Large Text"
                >
                  <Type className="h-4 w-4" />
                  Large
                </button>
                <button
                  type="button"
                  onClick={() => applyTextFormat('color=red')}
                  className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                  title="Red Text"
                >
                  Red
                </button>
                <button
                  type="button"
                  onClick={() => applyTextFormat('color=green')}
                  className="px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                  title="Green Text"
                >
                  Green
                </button>
                <button
                  type="button"
                  onClick={() => applyTextFormat('color=blue')}
                  className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                  title="Blue Text"
                >
                  Blue
                </button>
                <button
                  type="button"
                  onClick={() => applyTextFormat('paragraph')}
                  className="px-2 py-1 bg-gray-700 text-white rounded hover:bg-gray-600"
                  title="Add Paragraph Break"
                >
                  Paragraph
                </button>
                <button
                  type="button"
                  onClick={() => applyTextFormat('bar')}
                  className="px-2 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 flex items-center gap-1"
                  title="Add Horizontal Rule"
                >
                  <Minus className="h-4 w-4" />
                  HR
                </button>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={linkUrl}
                    onChange={handleDescriptionLinkUrlChange}
                    placeholder="Enter link URL"
                    className="px-2 py-1 bg-black/30 border border-red-800/40 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600"
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={() => applyTextFormat('link')}
                    className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
                    title="Add Link"
                  >
                    <Link className="h-4 w-4" />
                    Add Link
                  </button>
                </div>
              </div>
              <textarea
                ref={textareaRef}
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Enter description..."
                className="w-full h-32 p-3 bg-black/30 border border-red-800/40 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600 resize-y transition-all duration-200"
                disabled={isSubmitting}
              />
              <div className="mt-4">
                <h3 className="text-sm text-gray-300 mb-2">Preview</h3>
                <div
                  className="text-white prose prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: convertToHtml(formData.description) }}
                />
              </div>
            </div>

            {/* Tool Image Upload + Preview */}
            <div className="col-span-1">
              <label className="block text-sm text-gray-300 mb-1">Tool Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileChange(e, 'image')}
                disabled={isSubmitting}
                className="w-full text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-red-600 file:text-white hover:file:bg-red-700"
              />
              {formData.image && (
                <div className="mt-3">
                  <img
                    src={URL.createObjectURL(formData.image)}
                    alt="Preview"
                    className="h-40 w-full object-cover rounded-lg border border-gray-600 shadow-md hover:shadow-lg transition-shadow duration-200"
                  />
                </div>
              )}
            </div>

            {/* Download Type Selection */}
            <div className="col-span-1">
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

            {/* File Upload or Link Inputs */}
            {formData.downloadType === 'file' && (
              <div className="col-span-1">
                <label className="block text-sm text-gray-300 mb-1">Upload File (.zip or .exe)</label>
                <input
                  type="file"
                  accept=".zip,.exe"
                  onChange={(e) => handleFileChange(e, 'downloadFile')}
                  disabled={isSubmitting}
                  className="w-full text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-red-600 file:text-white hover:file:bg-red-700"
                />
                {formData.size && <p className="text-sm text-gray-300 mt-1">Size: {formData.size}</p>}
              </div>
            )}
            {formData.downloadType === 'link' && (
              <>
                <div className="col-span-1 relative">
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
                <div className="col-span-1 relative">
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
              </>
            )}

            {/* Price Selection */}
            <div className="col-span-1">
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
              <div className="col-span-1 relative">
                <label className="block text-sm text-gray-300 mb-1">Price (₦)</label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="number"
                    name="price"
                    value={formData.price ?? ''}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, price: Number(e.target.value) || null }))
                    }
                    placeholder="Enter price"
                    className="w-full pl-10 pr-4 py-3 bg-black/30 border border-red-800/40 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600 transition-all duration-200"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            )}

            {/* OS */}
            <div className="col-span-1 relative">
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

            {/* Architecture */}
            <div className="col-span-1 relative">
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

            {/* Rating */}
            <div className="col-span-1 relative">
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

            {/* Security */}
            <div className="col-span-1 relative">
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

          {/* Screenshots Upload + Preview (FIXED FOR MOBILE/IPHONE) */}
          <div>
            <label className="block text-sm text-gray-300 mb-2">Screenshots</label>
            <label
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="border-2 border-dashed border-red-800/40 p-4 rounded-lg bg-black/20 hover:bg-black/30 transition-colors duration-200 cursor-pointer flex flex-col items-center justify-center min-h-[100px]"
            >
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleFileChange(e, 'screenshots')}
                disabled={isSubmitting}
                className="hidden" 
              />
              <p className="text-gray-400 text-center pointer-events-none">
                Drag & drop images here or click to upload
              </p>
            </label>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
              {formData.screenshots.map((file, index) => (
                <div key={index} className="relative group">
                  <p className="text-xs text-gray-300 mb-1 text-center">image_{index + 1}</p>
                  <img
                    src={URL.createObjectURL(file)}
                    alt={`image_${index + 1}`}
                    className="h-32 w-full object-cover rounded-lg border border-gray-600 shadow-md transition-all duration-200 group-hover:shadow-lg"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveScreenshot(index)}
                    className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Submit Section */}
          <div className="space-y-4">
            {isSubmitting && (
              <div className="w-full bg-gray-700 rounded-full h-2.5">
                <div
                  className="bg-red-600 h-2.5 rounded-full transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
            <button
              type="submit"
              disabled={
                isSubmitting ||
                !formData.title ||
                !formData.description ||
                !formData.image ||
                (formData.downloadType === 'file' && !formData.downloadFile) ||
                (formData.downloadType === 'link' && !formData.downloadUrl)
              }
              className="w-full py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center gap-2 font-semibold shadow-md hover:shadow-lg transition-all duration-200 disabled:bg-gray-500 disabled:cursor-not-allowed"
            >
              {isSubmitting && <Loader2 className="h-5 w-5 animate-spin" />}
              {isSubmitting ? 'Uploading...' : 'Upload Tool'}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
};

export default UploadToolPage;
