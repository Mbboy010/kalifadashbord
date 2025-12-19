'use client';

import { useState, useRef } from 'react';
import { 
  Minus, Tag, Monitor, Cpu, Shield, Star, Loader2, Link as LinkIcon, 
  Type, Bold, Image as ImageIcon, UploadCloud, X, FileArchive, DollarSign, 
  AlignCenter, Underline, CheckCircle2, Eye, Edit3, AlignLeft, 
  Plus, LayoutGrid, HardDrive, Check, AlertCircle, Info
} from 'lucide-react';
// ✅ Real Backend Imports
import { db } from '@/server/firebaseApi';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { storage } from '@/server/appwrite';
import { v4 as uuidv4 } from 'uuid';

// --- Interfaces ---
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

interface ToastState {
  show: boolean;
  message: string;
  type: 'success' | 'error' | 'info';
}

// --- Helper Functions ---
const cropAndResizeImage = (file: File, maxSize = 500): Promise<File> => {
  return new Promise((resolve) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (e) => (img.src = e.target?.result as string);
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
      canvas.toBlob((blob) => {
        if (blob) resolve(new File([blob], file.name.replace(/\.[^/.]+$/, '') + '.png', { type: 'image/png' }));
      }, 'image/png', 1.0);
    };
    reader.readAsDataURL(file);
  });
};

const resizeImage = (file: File, maxSize = 800): Promise<File> => {
  return new Promise((resolve) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = (e) => (img.src = e.target?.result as string);
    img.onload = () => {
      let { width, height } = img;
      if (width > height) {
        if (width > maxSize) { height *= maxSize / width; width = maxSize; }
      } else {
        if (height > maxSize) { width *= maxSize / height; height = maxSize; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        if (blob) resolve(new File([blob], file.name.replace(/\.[^/.]+$/, '') + '.png', { type: 'image/png' }));
      }, 'image/png', 1.0);
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
    const url = storage.getFileDownload(bucketId, uploaded.$id);
    return toUrlString(url);
};

const convertToHtml = (text: string): string => {
  let result = text;
  result = result.replace(/\[center\](.*?)\[\/center\]/g, '<div class="text-center">$1</div>');
  result = result.replace(/\[underline\](.*?)\[\/underline\]/g, '<span class="underline underline-offset-4">$1</span>');
  result = result.replace(/\[bold\](.*?)\[\/bold\]/g, '<strong class="font-bold text-white">$1</strong>');
  result = result.replace(/\[size=sm\](.*?)\[\/size\]/g, '<span class="text-sm">$1</span>');
  result = result.replace(/\[size=md\](.*?)\[\/size\]/g, '<span class="text-base">$1</span>');
  result = result.replace(/\[size=lg\](.*?)\[\/size\]/g, '<span class="text-xl font-semibold">$1</span>');
  result = result.replace(/\[color=red\](.*?)\[\/color\]/g, '<span class="text-red-500">$1</span>');
  result = result.replace(/\[color=green\](.*?)\[\/color\]/g, '<span class="text-emerald-500">$1</span>');
  result = result.replace(/\[color=blue\](.*?)\[\/color\]/g, '<span class="text-blue-500">$1</span>');
  result = result.replace(/\[link href="([^"]+)"\](.*?)\[\/link\]/g, '<a href="$1" class="text-blue-400 hover:text-blue-300 hover:underline transition-colors" target="_blank" rel="noopener noreferrer">$2</a>');
  result = result.replace(/\[bar\/\]/g, '<hr class="border-t border-white/10 my-4"/>');
  result = result.replace(/\n\n/g, '<br/><br/>');
  result = result.replace(/\n/g, '<br/>');
  return result.replace(/\[\/?[a-zA-Z0-9= "]*\]/g, '');
};

const validateDescription = (text: string): boolean => {
  const pairedTags = ["center", "underline", "bold", "size", "color", "link"];
  const selfClosingTags = ["bar"];
  const tagPattern = /\[\/?[a-zA-Z]+(?:=[^\]]+)?(?: [^\]]+)?\/?\]/g;
  const tags = text.match(tagPattern) || [];
  const stack: string[] = [];

  for (const tag of tags) {
    const selfCloseMatch = tag.match(/^\[([a-zA-Z]+)\/\]$/);
    if (selfCloseMatch) {
      if (!selfClosingTags.includes(selfCloseMatch[1])) return false;
      continue;
    }
    const openMatch = tag.match(/^\[([a-zA-Z]+)(?:=[^\]]+)?(?: [^\]]+)?\]$/);
    if (openMatch) {
      if (!pairedTags.includes(openMatch[1])) return false;
      stack.push(openMatch[1]);
      continue;
    }
    const closeMatch = tag.match(/^\[\/([a-zA-Z]+)\]$/);
    if (closeMatch) {
      if (!pairedTags.includes(closeMatch[1])) return false;
      if (stack.pop() !== closeMatch[1]) return false;
    }
  }
  return stack.length === 0;
};

// --- Custom Alert Component ---
const Toast = ({ show, message, type, onClose }: ToastState & { onClose: () => void }) => {
  if (!show) return null;
  
  const bgColors = {
    success: 'bg-green-900/90 border-green-500/50 text-green-100',
    error: 'bg-red-900/90 border-red-500/50 text-red-100',
    info: 'bg-blue-900/90 border-blue-500/50 text-blue-100',
  };
  const Icons = {
    success: CheckCircle2,
    error: AlertCircle,
    info: Info
  };
  const Icon = Icons[type];

  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-md p-4 rounded-xl border backdrop-blur-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 fade-in duration-300 ${bgColors[type]}`}>
      <Icon className="w-5 h-5 shrink-0" />
      <span className="text-sm font-medium flex-1">{message}</span>
      <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

// --- Main Component ---
const UploadToolPage: React.FC = () => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Toast State
  const [toast, setToast] = useState<ToastState>({ show: false, message: '', type: 'info' });
  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000);
  };

  const [formData, setFormData] = useState<ToolForm>({
    title: '', description: '', image: null, downloadFile: null, downloadUrl: null,
    downloads: 0, priceType: 'Free', price: null, os: '', architecture: '',
    date: new Date().toISOString(), rating: '', security: '', screenshots: [],
    size: '', downloadType: 'file',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [editorMode, setEditorMode] = useState<'write' | 'review'>('write');
  const [linkUrl, setLinkUrl] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, field: keyof ToolForm) => {
    const file = e.target.files?.[0] || null;
    if (field === 'downloadFile' && file) {
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

  const handleRemoveScreenshot = (index: number) => {
    setFormData(prev => ({
        ...prev,
        screenshots: prev.screenshots.filter((_, i) => i !== index)
    }));
  };

  const handleScreenshotDrop = async (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
        const resizedFiles = await Promise.all(files.map((f) => resizeImage(f, 800)));
        setFormData((prev) => ({ ...prev, screenshots: [...prev.screenshots, ...resizedFiles] }));
    }
  };

  const applyTextFormat = (format: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = formData.description.substring(start, end);
    let newText = formData.description;
    let insertion = '';

    if (format === 'link') {
      if (!linkUrl) {
        showToast('Please enter a URL first', 'error');
        return;
      }
      insertion = `[link href="${linkUrl}"]${selectedText || 'Link'}[/link]`;
      setLinkUrl('');
    } else if (format === 'bar') {
      insertion = `[bar/]`;
    } else if (format.includes('=')) {
      const tag = format.split('=')[0];
      insertion = `[${format}]${selectedText}[/${tag}]`;
    } else {
      insertion = `[${format}]${selectedText}[/${format}]`;
    }
    
    newText = formData.description.substring(0, start) + insertion + formData.description.substring(end);
    setFormData((prev) => ({ ...prev, description: newText }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.description || !formData.image) {
      showToast('Please fill all required fields (Title, Description, Image)', 'error');
      return;
    }
    if (!validateDescription(formData.description)) {
      showToast('Description has broken formatting tags.', 'error');
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
      showToast('Tool uploaded successfully!', 'success');
      
      // Reset Form
      setFormData({
        title: '', description: '', downloads: 0, image: null,
        downloadFile: null, downloadUrl: null, priceType: 'Free', price: null,
        os: '', architecture: '', date: new Date().toISOString(), rating: '',
        security: '', screenshots: [], size: '', downloadType: 'file',
      });
      setLinkUrl('');
    } catch (err) {
      console.error(err);
      showToast('Upload failed! Check connection.', 'error');
    } finally {
      setIsSubmitting(false);
      setProgress(0);
    }
  };

  const InputWrapper = ({ label, icon: Icon, children }: any) => (
    <div className="relative group w-full">
      <label className="block text-[10px] uppercase font-bold text-gray-500 mb-1 tracking-widest">{label}</label>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-red-500 transition-colors pointer-events-none">
          <Icon size={16} />
        </div>
        {children}
      </div>
    </div>
  );

  // FIX: Added text-base to prevent zoom on iOS
  const baseInputClass = "w-full pl-9 pr-4 py-4 bg-[#1a1a1a] border border-[#333] rounded-lg text-base text-gray-200 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all appearance-none";

  return (
    <div className="min-h-screen bg-[#090909] text-gray-100 font-sans selection:bg-red-500/30 pb-20">
      
      {/* Toast Notification Container */}
      <Toast show={toast.show} message={toast.message} type={toast.type} onClose={() => setToast(prev => ({ ...prev, show: false }))} />

      {/* Top Bar */}
      <div className="h-16 border-b border-[#222] bg-[#0f0f0f]/80 backdrop-blur-md flex items-center px-4 md:px-6 justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-red-600 to-red-800 rounded-md flex items-center justify-center shadow-red-900/20 shadow-lg">
            <UploadCloud size={18} className="text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight hidden md:inline">Dev<span className="text-red-500">Store</span> Creator</span>
          <span className="font-bold text-lg tracking-tight md:hidden">Creator</span>
        </div>
        <button disabled={isSubmitting} onClick={handleSubmit} className="px-4 py-2 bg-white text-black text-xs font-bold rounded-full hover:bg-gray-200 transition flex items-center gap-2">
          {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
          Publish
        </button>
      </div>

      <div className="max-w-5xl mx-auto p-4 md:p-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* 1. Header Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
               <InputWrapper label="Application Name" icon={Tag}>
                 <input name="title" value={formData.title} onChange={handleChange} placeholder="e.g. Photoshop 2024" className={baseInputClass} />
               </InputWrapper>
               
               <div className="grid grid-cols-2 gap-4">
                 <InputWrapper label="OS" icon={Monitor}>
                    <select name="os" value={formData.os} onChange={handleChange} className={baseInputClass}>
                        <option value="">Select OS...</option>
                        <optgroup label="Windows">
                            <option value="Windows 11">Windows 11</option>
                            <option value="Windows 10">Windows 10</option>
                            <option value="Windows 7">Windows 7</option>
                        </optgroup>
                        <optgroup label="Other">
                            <option value="Linux">Linux</option>
                            <option value="Android">Android</option>
                        </optgroup>
                    </select>
                 </InputWrapper>
                 <InputWrapper label="Architecture" icon={Cpu}>
                    <select name="architecture" value={formData.architecture} onChange={handleChange} className={baseInputClass}>
                      <option value="">Select Arch...</option>
                      <option value="64 bit">64 bit</option>
                      <option value="32 bit">32 bit</option>
                      <option value="ARM64">ARM64</option>
                    </select>
                 </InputWrapper>
               </div>

               <div className="grid grid-cols-2 gap-4">
                 <InputWrapper label="Rating" icon={Star}>
                    <select name="rating" value={formData.rating} onChange={handleChange} className={baseInputClass}>
                        <option value="">Select Rating...</option>
                        <option value="5/5">5.0 Stars</option>
                        <option value="4.5/5">4.5 Stars</option>
                        <option value="4/5">4.0 Stars</option>
                    </select>
                 </InputWrapper>
                 <InputWrapper label="Security" icon={Shield}>
                    <select name="security" value={formData.security} onChange={handleChange} className={baseInputClass}>
                        <option value="">Select Status...</option>
                        <option value="safe">Safe</option>
                        <option value="medium">Medium</option>
                        <option value="high">High Risk</option>
                    </select>
                 </InputWrapper>
               </div>
            </div>
            
            {/* Main Image Upload Tile - Touch Friendly */}
            <div className="relative group aspect-square bg-[#1a1a1a] border-2 border-dashed border-[#333] rounded-xl flex flex-col items-center justify-center overflow-hidden hover:border-red-500/50 transition cursor-pointer active:scale-95 duration-200">
              <input type="file" onChange={(e) => handleFileChange(e, 'image')} className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full" />
              {formData.image ? (
                <img src={URL.createObjectURL(formData.image)} className="w-full h-full object-cover" />
              ) : (
                <>
                  <ImageIcon className="text-gray-600 mb-2 group-hover:text-gray-400" />
                  <span className="text-xs text-gray-500 font-medium">Upload Icon</span>
                </>
              )}
            </div>
          </div>

          {/* 2. MS Word Style Editor - Mobile Optimized */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
                <label className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">Description</label>
                <div className="flex bg-[#1a1a1a] p-1 rounded-lg border border-[#333]">
                  <button type="button" onClick={() => setEditorMode('write')} className={`px-3 py-1 text-xs font-medium rounded-md flex items-center gap-1.5 transition ${editorMode === 'write' ? 'bg-[#333] text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}>
                    <Edit3 size={12} /> Edit
                  </button>
                  <button type="button" onClick={() => setEditorMode('review')} className={`px-3 py-1 text-xs font-medium rounded-md flex items-center gap-1.5 transition ${editorMode === 'review' ? 'bg-[#333] text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}>
                    <Eye size={12} /> Review
                  </button>
                </div>
            </div>

            <div className="border border-[#333] rounded-xl overflow-hidden bg-[#111] shadow-2xl flex flex-col min-h-[400px]">
              {/* Ribbon - Horizontal Scroll for Mobile */}
              <div className="bg-[#1a1a1a] border-b border-[#333] p-2 flex items-center gap-1 flex-nowrap overflow-x-auto select-none no-scrollbar">
                 <div className="flex items-center gap-1 pr-2 border-r border-[#333] mr-2 shrink-0">
                    <button type="button" onClick={() => applyTextFormat('bold')} className="p-2 text-gray-400 hover:bg-[#2a2a2a] hover:text-white rounded"><Bold size={16}/></button>
                    <button type="button" onClick={() => applyTextFormat('underline')} className="p-2 text-gray-400 hover:bg-[#2a2a2a] hover:text-white rounded"><Underline size={16}/></button>
                    <button type="button" onClick={() => applyTextFormat('size=lg')} className="p-2 text-gray-400 hover:bg-[#2a2a2a] hover:text-white rounded"><Type size={16}/></button>
                 </div>
                 <div className="flex items-center gap-1 pr-2 border-r border-[#333] mr-2 shrink-0">
                    <button type="button" className="p-2 text-white bg-[#2a2a2a] rounded"><AlignLeft size={16}/></button>
                    <button type="button" onClick={() => applyTextFormat('center')} className="p-2 text-gray-400 hover:bg-[#2a2a2a] hover:text-white rounded"><AlignCenter size={16}/></button>
                 </div>
                 <div className="flex items-center gap-2 pr-2 border-r border-[#333] mr-2 px-2 shrink-0">
                    <button type="button" onClick={() => applyTextFormat('color=red')} className="w-5 h-5 rounded-full bg-red-500 ring-1 ring-white/10"></button>
                    <button type="button" onClick={() => applyTextFormat('color=green')} className="w-5 h-5 rounded-full bg-emerald-500 ring-1 ring-white/10"></button>
                    <button type="button" onClick={() => applyTextFormat('color=blue')} className="w-5 h-5 rounded-full bg-blue-500 ring-1 ring-white/10"></button>
                 </div>
                 <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center bg-[#0d0d0d] rounded-md px-2 py-1 border border-[#333]">
                        <LinkIcon size={12} className="text-gray-500 mr-2"/>
                        <input type="text" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://..." className="bg-transparent border-none text-xs w-20 text-white focus:outline-none"/>
                        <button type="button" onClick={() => applyTextFormat('link')} className="text-[10px] text-blue-400 font-bold ml-1">ADD</button>
                    </div>
                    <button type="button" onClick={() => applyTextFormat('bar')} className="p-2 text-gray-400 hover:bg-[#2a2a2a] hover:text-white rounded"><Minus size={16}/></button>
                 </div>
              </div>

              {/* Editor Area */}
              <div className="flex-1 bg-[#151515] p-4 overflow-y-auto relative">
                 <div className="max-w-3xl mx-auto min-h-[350px] bg-[#0a0a0a] border border-[#222] p-4 md:p-8 relative">
                    {editorMode === 'write' ? (
                        <textarea
                            ref={textareaRef}
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            className="w-full h-full min-h-[350px] bg-transparent resize-none focus:outline-none text-gray-300 font-mono text-base leading-relaxed"
                            placeholder="Start typing..."
                        />
                    ) : (
                        <div className="prose prose-invert prose-sm max-w-none">
                            <div className="text-center mb-8 pb-4 border-b border-white/10">
                                <h1 className="text-2xl font-bold text-white m-0">{formData.title || 'Untitled Tool'}</h1>
                                <p className="text-gray-500 text-xs m-0 mt-2 uppercase tracking-widest">{formData.date.split('T')[0]}</p>
                            </div>
                            <div dangerouslySetInnerHTML={{ __html: convertToHtml(formData.description) }} />
                        </div>
                    )}
                 </div>
              </div>

              {/* Status Bar */}
              <div className="bg-[#1a1a1a] border-t border-[#333] px-4 py-1 flex items-center justify-between text-[10px] text-gray-500 uppercase tracking-wider font-semibold select-none">
                 <div className="flex gap-4">
                    <span>Page 1 of 1</span>
                    <span>{formData.description.length} Chars</span>
                 </div>
                 <span>UTF-8</span>
              </div>
            </div>
          </div>

          {/* 3. Visual Assets / Screenshots Section */}
          <div className="bg-[#1a1a1a] border border-[#333] rounded-xl p-6">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <LayoutGrid size={16} className="text-yellow-500"/> 
                Visual Assets
            </h3>
            
            <label 
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleScreenshotDrop}
                className="block w-full border-2 border-dashed border-[#333] rounded-xl bg-[#111] hover:bg-[#151515] hover:border-gray-600 transition-all cursor-pointer p-6 mb-6 group active:bg-[#222]"
            >
                <input type="file" multiple accept="image/*" onChange={(e) => handleFileChange(e, 'screenshots')} className="hidden" />
                <div className="flex flex-col items-center justify-center text-gray-500 group-hover:text-gray-300">
                    <div className="w-12 h-12 rounded-full bg-[#222] flex items-center justify-center mb-3 group-hover:bg-[#333] transition">
                        <Plus size={24} />
                    </div>
                    <p className="text-sm font-medium">Tap to browse or drag images</p>
                    <p className="text-xs text-gray-600 mt-1">Supports PNG, JPG</p>
                </div>
            </label>

            {formData.screenshots.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-in fade-in duration-500">
                    {formData.screenshots.map((file, index) => (
                        <div key={index} className="relative group aspect-video bg-[#111] rounded-lg border border-[#333] overflow-hidden">
                            <img src={URL.createObjectURL(file)} alt="Screenshot" className="w-full h-full object-cover" />
                            {/* Improved Mobile Deletion UX: Always visible on touch devices if preferred, but standard implementation relies on tap */}
                            <button 
                                type="button" 
                                onClick={() => handleRemoveScreenshot(index)}
                                className="absolute top-1 right-1 p-2 bg-red-600 text-white rounded-full hover:bg-red-700 shadow-lg"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
          </div>

          {/* 4. Bottom Section: File & Pricing */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="bg-[#1a1a1a] p-6 rounded-xl border border-[#333]">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><FileArchive size={16} className="text-red-500"/> Source File</h3>
                
                <div className="flex gap-2 mb-4">
                    <button type="button" onClick={() => setFormData(p => ({...p, downloadType: 'file'}))} className={`flex-1 py-3 text-xs font-bold rounded border transition-colors ${formData.downloadType === 'file' ? 'bg-red-600 border-red-600 text-white' : 'border-[#333] text-gray-500 hover:border-gray-500'}`}>Upload File</button>
                    <button type="button" onClick={() => setFormData(p => ({...p, downloadType: 'link'}))} className={`flex-1 py-3 text-xs font-bold rounded border transition-colors ${formData.downloadType === 'link' ? 'bg-red-600 border-red-600 text-white' : 'border-[#333] text-gray-500 hover:border-gray-500'}`}>External Link</button>
                </div>

                {formData.downloadType === 'file' ? (
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">Select .zip or .exe</label>
                        <input type="file" onChange={(e) => handleFileChange(e, 'downloadFile')} className="block w-full text-xs text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#333] file:text-white hover:file:bg-[#444]" />
                    </div>
                ) : (
                    <div className="space-y-4">
                        <InputWrapper label="Download URL" icon={LinkIcon}>
                             <input type="text" name="downloadUrl" value={formData.downloadUrl || ''} onChange={(e) => setFormData(p => ({...p, downloadUrl: e.target.value}))} placeholder="https://drive.google.com/..." className={baseInputClass} />
                        </InputWrapper>
                        
                        <InputWrapper label="File Size (Manual)" icon={HardDrive}>
                             <input type="text" name="size" value={formData.size} onChange={handleChange} placeholder="e.g. 1.5 GB" className={baseInputClass} />
                        </InputWrapper>
                    </div>
                )}
             </div>

             <div className="bg-[#1a1a1a] p-6 rounded-xl border border-[#333]">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><DollarSign size={16} className="text-green-500"/> Pricing</h3>
                <select name="priceType" value={formData.priceType} onChange={handleChange} className={`${baseInputClass} mb-3`}>
                    <option value="Free">Free</option>
                    <option value="Paid">Paid</option>
                </select>
                {formData.priceType === 'Paid' && (
                    <input type="number" name="price" placeholder="Amount (NGN)" onChange={handleChange} className={baseInputClass} />
                )}
             </div>
          </div>

        </form>
      </div>
    </div>
  );
};

export default UploadToolPage;
