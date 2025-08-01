'use client';

import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { Upload, CheckCircle, Package } from 'lucide-react';
import { gsap } from 'gsap';
import { storage, ID } from '@/server/appwrite';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/server/firebaseApi';

interface FormData {
  title: string;
  version: string;
  file: File | null;
}

const UploadDownloadFiles: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    title: '',
    version: '',
    file: null,
  });
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const [remainingTime, setRemainingTime] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [fileInputKey, setFileInputKey] = useState<number>(Date.now());

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value, files } = e.target;
    if (name === 'file' && files?.[0]) {
      setFormData((prev) => ({ ...prev, file: files[0] }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleUpload = async (e: FormEvent) => {
    e.preventDefault(); // Prevent form submission default behavior

    const { title, version, file } = formData;

    if (!title || !version || !file) {
      setUploadStatus('Please fill all fields and select a file!');
      return;
    }

    setIsUploading(true);
    setUploadStatus('Uploading...');
    setProgress(0);
    setRemainingTime(null);

    try {
      // Ensure environment variable is defined
      const bucketId = process.env.NEXT_PUBLIC_STORAGE_BUCKET;
      if (!bucketId) {
        throw new Error('Storage bucket ID is not defined');
      }

      // Rename file with the title and preserve .apk extension
      const renamedFile = new File([file], `${title}.apk`, {
        type: file.type,
        lastModified: file.lastModified,
      });

      const uploadResponse = await storage.createFile(
        bucketId,
        ID.unique(),
        renamedFile
      );

      const downloadUrl = storage.getFileDownload(bucketId, uploadResponse.$id);

      await addDoc(collection(db, 'download'), {
        title,
        version,
        link: downloadUrl,
        appwriteFileId: uploadResponse.$id,
        createdAt: serverTimestamp(),
      });

      let fakeProgress = 0;
      const interval = setInterval(() => {
        fakeProgress += 5;
        const estTimeLeft = ((100 - fakeProgress) / 5).toFixed(1);
        setProgress(fakeProgress);
        setRemainingTime(`${estTimeLeft}s`);

        if (fakeProgress >= 100) {
          clearInterval(interval);
          setProgress(100);
          setRemainingTime(null);
          setUploadStatus('Upload Complete!');
          setFormData({ title: '', version: '', file: null });
          setFileInputKey(Date.now()); // Reset file input
          setIsUploading(false);
        }
      }, 200);
    } catch (err) {
      console.error('Upload error:', err);
      setUploadStatus('Upload failed.');
      setIsUploading(false);
    }
  };

  useEffect(() => {
    gsap.from('.upload-card', { opacity: 0, y: 50, duration: 0.6 });
  }, []);

  return (
    <div className="bg-gradient-to-br from-black/70 to-red-900/20 min-h-screen w-screen">
      <section className="py-12 px-4 mt-16 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto">
          <h2 className="text-2xl font-bold text-red-500 mb-6 text-center">Upload Downloadable APK</h2>
          <form className="upload-card bg-black/40 backdrop-blur-md p-6 rounded-xl shadow-lg" onSubmit={handleUpload}>
            <div className="flex items-center justify-center mb-6">
              <Package className="text-red-400 h-12 w-12" />
            </div>

            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Title"
              className="w-full mb-4 p-2 bg-black/20 border border-red-800/30 rounded-lg text-white"
            />
            <input
              type="text"
              name="version"
              value={formData.version}
              onChange={handleChange}
              placeholder="Version (e.g., 1.0.0)"
              className="w-full mb-4 p-2 bg-black/20 border border-red-800/30 rounded-lg text-white"
            />
            <input
              key={fileInputKey} // Key to reset file input
              type="file"
              name="file"
              accept=".apk"
              onChange={handleChange}
              className="w-full mb-4 p-2 bg-black/20 border border-red-800/30 rounded-lg text-white"
            />

            <button
              type="submit"
              disabled={!formData.title || !formData.version || !formData.file || isUploading}
              className={`w-full py-2 rounded-lg text-white ${
                isUploading
                  ? 'bg-gray-500 cursor-not-allowed'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {isUploading ? (
                <span className="animate-pulse">Uploading...</span>
              ) : (
                <>
                  <Upload className="inline h-5 w-5 mr-2" /> Upload APK
                </>
              )}
            </button>

            {uploadStatus && (
              <p className="upload-status mt-4 text-center text-green-400">
                {uploadStatus} <CheckCircle className="inline h-5 w-5" />
              </p>
            )}

            {progress > 0 && progress < 100 && (
              <div className="mt-4">
                <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500 transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-white mt-1 text-center">
                  {progress}% {remainingTime && `— Est: ${remainingTime}`}
                </p>
              </div>
            )}
          </form>
        </div>
      </section>
    </div>
  );
};

export default UploadDownloadFiles;