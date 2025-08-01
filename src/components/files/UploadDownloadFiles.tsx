'use client';

import { useState, useEffect } from 'react';
import { Upload, CheckCircle, Package } from 'lucide-react'; // Icons for upload and APK
import { gsap } from 'gsap';

const UploadDownloadFiles: React.FC = () => {
  const [formData, setFormData] = useState({
    title: '',
    version: '',
    file: null as File | null,
  });
  const [uploadStatus, setUploadStatus] = useState<string>('');

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, files } = e.target;
    if (name === 'file' && files) {
      setFormData((prev) => ({ ...prev, [name]: files[0] }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Handle upload
  const handleUpload = () => {
    if (formData.title && formData.version && formData.file) {
      setUploadStatus('Uploading...');
      gsap.to('.upload-status', { opacity: 1, duration: 0.3 });
      setTimeout(() => {
        setUploadStatus('Upload Complete!');
        gsap.to('.upload-status', { opacity: 0, duration: 0.3, delay: 1 });
        setFormData({ title: '', version: '', file: null });
      }, 2000); // Simulate upload delay
    } else {
      setUploadStatus('Please fill all fields and select a file!');
      gsap.to('.upload-status', { opacity: 1, duration: 0.3, color: '#ff4444' });
      setTimeout(() => gsap.to('.upload-status', { opacity: 0, duration: 0.3 }), 2000);
    }
  };

  // Animation on mount
  useEffect(() => {
    gsap.from('.upload-card', { opacity: 0, y: 50, duration: 0.6, ease: 'power2.out' });
  }, []);

  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-black/70 to-red-900/40" style={{ backgroundImage: 'linear-gradient(45deg, rgba(255, 0, 0, 0.2), rgba(0, 0, 0, 0.8))' }}>
      <div className="max-w-md mx-auto">
        <h2 className="text-2xl font-bold text-red-500 mb-6 text-center">Upload Downloadable APK</h2>
        <div className="upload-card bg-black/40 backdrop-blur-md p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-center mb-6">
            <Package className="text-red-400 h-12 w-12" />
          </div>
          {/* Title Input */}
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="Title"
            className="w-full mb-4 p-2 bg-black/20 border border-red-800/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-600"
          />
          {/* Version Input */}
          <input
            type="text"
            name="version"
            value={formData.version}
            onChange={handleChange}
            placeholder="Version (e.g., 1.0.0)"
            className="w-full mb-4 p-2 bg-black/20 border border-red-800/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-600"
          />
          {/* File Input */}
          <input
            type="file"
            name="file"
            accept=".apk"
            onChange={handleChange}
            className="w-full mb-4 p-2 bg-black/20 border border-red-800/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-600"
          />
          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={!formData.title || !formData.version || !formData.file}
            className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors duration-300 disabled:bg-gray-500 disabled:cursor-not-allowed"
          >
            <Upload className="inline h-5 w-5 mr-2" /> Upload APK
          </button>
          {/* Upload Status */}
          {uploadStatus && (
            <p className="upload-status mt-4 text-center text-green-400 opacity-0">
              {uploadStatus} <CheckCircle className="inline h-5 w-5" />
            </p>
          )}
        </div>
      </div>
    </section>
  );
};

export default UploadDownloadFiles;