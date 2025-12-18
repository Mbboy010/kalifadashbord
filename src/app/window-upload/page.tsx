'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Minus, Tag, Monitor, Cpu, Shield, Star, Loader2, Link as LinkIcon, 
  Type, Bold, Image as ImageIcon, UploadCloud, X, FileArchive, DollarSign, 
  AlignCenter, Underline, CheckCircle2
} from 'lucide-react';
import { gsap } from 'gsap';
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
  tagPairs.forEach(({ open, replace }) => (result = result.replace(open, replace)));
  selfClosingTags.forEach((tag) => (result = result.replace(tag, '<hr class="border-t border-gray-600 my-2"/>')));
  result = result.replace(/\n\n/g, '<br/><br/>');
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

// --- Main Component ---
const UploadToolPage: React.FC = () => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    gsap.fromTo(containerRef.current, 
      { opacity: 0, y: 30 }, 
      { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }
    );
  }, []);

  // Handlers
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, field: keyof ToolForm) => {
    const file = e.target.files?.[0] || null;
    if (field === 'downloadFile' && file) {
      if (!/\.(zip|exe)$/i.test(file.name)) {
        alert('Only .zip or .exe files allowed!');
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

  // Drag Drop
  const handleDrop = async (e: React.DragEvent<HTMLLabelElement>, type: 'screenshots' | 'image' | 'file') => {
    e.preventDefault();
    e.stopPropagation();
    if(type === 'screenshots') {
      const files = Array.from(e.dataTransfer.files);
      const resizedFiles = await Promise.all(files.map((f) => resizeImage(f, 800)));
      setFormData((prev) => ({ ...prev, screenshots: [...prev.screenshots, ...resizedFiles] }));
    }
    // Logic for single file drops could be added here similarly if needed
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
      if (!linkUrl || !/^https?:\/\//.test(linkUrl)) { alert('Invalid URL'); return; }
      insertion = `[link href="${linkUrl}"]${selectedText || 'Link'}[/link]`;
      setLinkUrl('');
    } else if (format === 'bar') {
      insertion = `[bar/]`;
    } else if (format === 'paragraph') {
      insertion = `\n\n`;
    } else if (format.includes('=')) {
      const tag = format.split('=')[0];
      insertion = `[${format}]${selectedText}[/${tag}]`;
    } else {
      insertion = `[${format}]${selectedText}[/${format}]`;
    }

    // Logic to insert and preserve cursor or selection
    if (format === 'paragraph' || format === 'bar') {
       newText = `${newText.substring(0, start)}${insertion}${newText.substring(end)}`;
    } else {
       newText = `${newText.substring(0, start)}${insertion}${newText.substring(end)}`;
    }
    setFormData((prev) => ({ ...prev, description: newText }));
    // Need a timeout to refocus properly after React state update, omitted for brevity
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.description || !formData.image) return alert('Missing fields');
    if (!validateDescription(formData.description)) return alert('Invalid formatting tags');

    setIsSubmitting(true);
    setProgress(10);

    try {
        const bucketId = process.env.NEXT_PUBLIC_STORAGE_BUCKET;
        if (!bucketId) throw new Error("Storage Bucket ID missing");

        const uniqueId = uuidv4();
        const docId = `${formData.title.replace(/[^a-zA-Z0-9]/g, '_')}_${uniqueId}`;
        
        // 1. Upload Main Image
        const imageFile = await storage.createFile(bucketId, 'unique()', formData.image);
        const imageUrl = String(storage.getFileDownload(bucketId, imageFile.$id));
        setProgress(30);

        // 2. Upload Tool File (if applicable)
        let finalDownloadUrl = formData.downloadUrl;
        if (formData.downloadType === 'file' && formData.downloadFile) {
            const toolFile = await storage.createFile(bucketId, 'unique()', formData.downloadFile);
            finalDownloadUrl = String(storage.getFileDownload(bucketId, toolFile.$id));
        }
        setProgress(60);

        // 3. Upload Screenshots
        const screenshotUrls = await Promise.all(formData.screenshots.map(async (file) => {
            const up = await storage.createFile(bucketId, 'unique()', file);
            return String(storage.getFileDownload(bucketId, up.$id));
        }));
        setProgress(90);

        // 4. Save to Firestore
        await setDoc(doc(db, 'Windows-tools', docId), {
            id: docId,
            ...formData,
            description: convertToHtml(formData.description),
            image: imageUrl,
            downloadUrl: finalDownloadUrl,
            screenshots: screenshotUrls,
            price: formData.priceType === 'Free' ? 0 : (formData.price || 0),
            createdAt: serverTimestamp(),
        });

        setProgress(100);
        alert('Tool uploaded successfully!');
        // Reset form... (Simplified for brevity)
    } catch (err) {
        console.error(err);
        alert('Upload failed');
    } finally {
        setIsSubmitting(false);
        setProgress(0);
    }
  };

  // --- UI Components ---

  const InputWrapper = ({ label, icon: Icon, children }: any) => (
    <div className="relative group">
      <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">{label}</label>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-red-500/80 group-focus-within:text-red-400 transition-colors">
          <Icon size={18} />
        </div>
        {children}
      </div>
    </div>
  );

  const inputClass = "w-full pl-10 pr-4 py-3 bg-zinc-900/50 border border-white/10 rounded-xl text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-transparent transition-all duration-300 backdrop-blur-sm";
  const selectClass = "w-full pl-10 pr-10 py-3 bg-zinc-900/50 border border-white/10 rounded-xl text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-500/50 appearance-none cursor-pointer hover:bg-zinc-800/50 transition-all";

  return (
    <section className="min-h-screen py-12 px-1 mt-7 flex justify-center bg-[#050505] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-900/20 via-[#0a0a0a] to-black">
      <div ref={containerRef} className="w-full max-w-4xl bg-black/40 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/10 overflow-hidden">
        
        {/* Header */}
        <div className="bg-red-600/10 border-b border-red-500/20 p-8 text-center">
          <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-300 tracking-tight">
            Deploy New Tool
          </h2>
          <p className="text-gray-400 text-sm mt-2">Fill in the metadata to publish your tool to the repository.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-10">
          
          {/* Section 1: General Info */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <span className="w-1 h-6 bg-red-600 rounded-full"></span> Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InputWrapper label="Tool Title" icon={Tag}>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="e.g. System Optimizer Pro"
                  className={inputClass}
                />
              </InputWrapper>
              
              <div className="grid grid-cols-2 gap-4">
                 <InputWrapper label="Price Type" icon={DollarSign}>
                    <select name="priceType" value={formData.priceType} onChange={handleChange} className={selectClass}>
                        <option value="Free">Free</option>
                        <option value="Paid">Paid</option>
                    </select>
                 </InputWrapper>
                 {formData.priceType === 'Paid' && (
                    <div className="relative animate-in fade-in zoom-in duration-300">
                        <input
                           type="number"
                           name="price"
                           value={formData.price ?? ''}
                           onChange={(e) => setFormData(prev => ({...prev, price: parseFloat(e.target.value)}))}
                           placeholder="₦ Price"
                           className={`${inputClass} pl-4`}
                        />
                    </div>
                 )}
              </div>
            </div>
          </div>

          {/* Section 2: Technical Specs */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <span className="w-1 h-6 bg-red-600 rounded-full"></span> Technical Specs
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
               <InputWrapper label="OS" icon={Monitor}>
                  <input name="os" value={formData.os} onChange={handleChange} placeholder="Windows 10/11" className={inputClass} />
               </InputWrapper>
               <InputWrapper label="Arch" icon={Cpu}>
                  <select name="architecture" value={formData.architecture} onChange={handleChange} className={selectClass}>
                    <option value="">Select...</option>
                    <option value="32 bit">32 bit</option>
                    <option value="64 bit">64 bit</option>
                    <option value="32 bit / 64 bit">Hybrid</option>
                  </select>
               </InputWrapper>
               <InputWrapper label="Rating" icon={Star}>
                  <select name="rating" value={formData.rating} onChange={handleChange} className={selectClass}>
                    <option value="">Select...</option>
                    {[0.5, 1.5, 2.5, 3.5, 4.5].map(r => <option key={r} value={`${r}/5`}>{r}/5 Stars</option>)}
                  </select>
               </InputWrapper>
               <InputWrapper label="Security" icon={Shield}>
                  <select name="security" value={formData.security} onChange={handleChange} className={selectClass}>
                    <option value="">Select...</option>
                    <option value="safe">Safe (Verified)</option>
                    <option value="medium">Medium Risk</option>
                    <option value="high">High Risk</option>
                  </select>
               </InputWrapper>
            </div>
          </div>

          {/* Section 3: Description & Rich Text */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
               <span className="w-1 h-6 bg-red-600 rounded-full"></span> Description
            </h3>
            <div className="bg-zinc-900/30 border border-white/10 rounded-xl overflow-hidden">
                {/* Toolbar */}
                <div className="flex flex-wrap items-center gap-1 p-2 bg-white/5 border-b border-white/10">
                    {[
                      { icon: AlignCenter, action: 'center', label: 'Center' },
                      { icon: Underline, action: 'underline', label: 'Underline' },
                      { icon: Bold, action: 'bold', label: 'Bold' },
                      { icon: Type, action: 'size=lg', label: 'Large' },
                      { icon: Minus, action: 'bar', label: 'Divider' },
                    ].map((btn, i) => (
                      <button type="button" key={i} onClick={() => applyTextFormat(btn.action)} className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded transition" title={btn.label}>
                        <btn.icon size={16} />
                      </button>
                    ))}
                    
                    <div className="h-5 w-[1px] bg-white/20 mx-1"></div>
                    
                    {/* Color Dots */}
                    <button type="button" onClick={() => applyTextFormat('color=red')} className="w-5 h-5 rounded-full bg-red-500 hover:scale-110 transition mx-1" title="Red"></button>
                    <button type="button" onClick={() => applyTextFormat('color=green')} className="w-5 h-5 rounded-full bg-green-500 hover:scale-110 transition mx-1" title="Green"></button>
                    <button type="button" onClick={() => applyTextFormat('color=blue')} className="w-5 h-5 rounded-full bg-blue-500 hover:scale-110 transition mx-1" title="Blue"></button>

                    <div className="h-5 w-[1px] bg-white/20 mx-1"></div>

                    {/* Link Input */}
                    <div className="flex items-center gap-1 bg-black/20 rounded px-1">
                        <input 
                            type="text" 
                            value={linkUrl} 
                            onChange={(e) => setLinkUrl(e.target.value)} 
                            placeholder="https://..." 
                            className="bg-transparent border-none text-xs text-white focus:ring-0 w-24 placeholder-gray-600"
                        />
                        <button type="button" onClick={() => applyTextFormat('link')} className="p-1 text-blue-400 hover:text-blue-300">
                            <LinkIcon size={14} />
                        </button>
                    </div>
                </div>
                
                <textarea
                  ref={textareaRef}
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="w-full h-40 p-4 bg-transparent text-gray-200 focus:outline-none resize-y"
                  placeholder="Describe features, installation steps, etc..."
                />
            </div>
          </div>

          {/* Section 4: Media Uploads */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Main Icon */}
            <div className="md:col-span-1 space-y-3">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Main Icon</label>
                <div className="relative group w-full aspect-square bg-zinc-900/50 border-2 border-dashed border-white/20 rounded-2xl overflow-hidden hover:border-red-500/50 transition-colors">
                    <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'image')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" />
                    {formData.image ? (
                        <div className="relative w-full h-full">
                            <img src={URL.createObjectURL(formData.image)} className="w-full h-full object-cover" alt="preview" />
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-white text-xs font-medium bg-black/60 px-3 py-1 rounded-full">Change</span>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500">
                            <ImageIcon size={32} className="mb-2 opacity-50"/>
                            <span className="text-xs">Upload Icon</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Screenshots */}
            <div className="md:col-span-2 space-y-3">
                <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Screenshots</label>
                <div 
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleDrop(e, 'screenshots')}
                    className="w-full min-h-[160px] bg-zinc-900/50 border-2 border-dashed border-white/20 rounded-2xl p-4 flex flex-col items-center justify-center relative hover:bg-zinc-800/30 transition"
                >
                    <input type="file" multiple accept="image/*" onChange={(e) => handleFileChange(e, 'screenshots')} className="absolute inset-0 opacity-0 cursor-pointer z-20" />
                    
                    {formData.screenshots.length === 0 ? (
                        <div className="text-center pointer-events-none">
                            <UploadCloud size={40} className="mx-auto text-red-500/50 mb-2"/>
                            <p className="text-sm text-gray-400">Drag & Drop screenshots here</p>
                            <p className="text-xs text-gray-600">or click to browse</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-3 gap-2 w-full z-30">
                            {formData.screenshots.map((s, i) => (
                                <div key={i} className="relative aspect-video rounded-lg overflow-hidden border border-white/10 group">
                                    <img src={URL.createObjectURL(s)} alt="" className="w-full h-full object-cover" />
                                    <button 
                                        type="button" 
                                        onClick={(e) => { e.preventDefault(); setFormData(p => ({...p, screenshots: p.screenshots.filter((_, idx) => idx !== i)})); }}
                                        className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            ))}
                            {/* Add More Button Tile */}
                            <div className="flex items-center justify-center aspect-video rounded-lg border border-white/10 bg-white/5 pointer-events-none">
                                <span className="text-xs text-gray-500">+ Add More</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
          </div>

          {/* Section 5: Download Config */}
          <div className="bg-zinc-900/30 p-6 rounded-2xl border border-white/5 space-y-6">
             <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <span className="w-1 h-6 bg-red-600 rounded-full"></span> Download Source
                </h3>
                <div className="flex bg-black/40 p-1 rounded-lg border border-white/10">
                    <button type="button" onClick={() => setFormData(p => ({...p, downloadType: 'file'}))} className={`px-4 py-1.5 text-xs rounded-md transition ${formData.downloadType === 'file' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'}`}>File Upload</button>
                    <button type="button" onClick={() => setFormData(p => ({...p, downloadType: 'link'}))} className={`px-4 py-1.5 text-xs rounded-md transition ${formData.downloadType === 'link' ? 'bg-red-600 text-white' : 'text-gray-400 hover:text-white'}`}>External URL</button>
                </div>
             </div>

             {formData.downloadType === 'file' ? (
                 <div className="relative group p-8 border-2 border-dashed border-red-900/30 rounded-xl bg-black/20 hover:bg-black/40 transition flex flex-col items-center justify-center">
                    <input type="file" accept=".zip,.exe" onChange={(e) => handleFileChange(e, 'downloadFile')} className="absolute inset-0 opacity-0 cursor-pointer" />
                    <FileArchive size={40} className={`mb-3 ${formData.downloadFile ? 'text-green-500' : 'text-gray-500'}`} />
                    {formData.downloadFile ? (
                        <div className="text-center">
                            <p className="text-white font-medium">{formData.downloadFile.name}</p>
                            <p className="text-xs text-gray-400 mt-1">{formData.size}</p>
                        </div>
                    ) : (
                        <div className="text-center">
                            <p className="text-gray-300">Click to upload .ZIP or .EXE</p>
                            <p className="text-xs text-gray-600 mt-1">Max file size depends on server config</p>
                        </div>
                    )}
                 </div>
             ) : (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <InputWrapper label="External Download URL" icon={LinkIcon}>
                        <input name="downloadUrl" value={formData.downloadUrl || ''} onChange={(e) => setFormData(p => ({...p, downloadUrl: e.target.value}))} placeholder="https://drive.google.com/..." className={inputClass} />
                     </InputWrapper>
                     <InputWrapper label="File Size Label" icon={Tag}>
                        <input name="size" value={formData.size} onChange={(e) => setFormData(p => ({...p, size: e.target.value}))} placeholder="e.g. 150 MB" className={inputClass} />
                     </InputWrapper>
                 </div>
             )}
          </div>

          {/* Submit Footer */}
          <div className="pt-4 border-t border-white/10">
            {isSubmitting && (
               <div className="mb-4">
                 <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>Uploading...</span>
                    <span>{progress}%</span>
                 </div>
                 <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-red-600 h-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                 </div>
               </div>
            )}
            
            <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-4 rounded-xl flex items-center justify-center gap-3 font-bold text-lg shadow-lg shadow-red-900/20 transition-all duration-300 ${
                    isSubmitting ? 'bg-zinc-800 text-gray-500 cursor-not-allowed' : 'bg-red-600 text-white hover:bg-red-700 hover:scale-[1.01]'
                }`}
            >
                {isSubmitting ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
                {isSubmitting ? 'Processing Upload...' : 'Publish Tool'}
            </button>
          </div>

        </form>
      </div>
    </section>
  );
};

export default UploadToolPage;
