import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, X, FileText, Image as ImageIcon, Link, Cloud } from 'lucide-react';
import { toast } from 'sonner';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const DocumentUpload = ({
  label,
  value,
  onChange,
  placeholder = "Enter document URL or upload file",
  accept = "image/*,application/pdf",
  maxSize = 10 * 1024 * 1024, // 10MB default for documents
  className = "",
  required = false
}) => {
  const [preview, setPreview] = useState(value || '');
  const [uploading, setUploading] = useState(false);
  const [fileType, setFileType] = useState(null);
  const fileInputRef = useRef(null);

  const handleUrlChange = (url) => {
    setPreview(url);
    onChange(url);
    // Try to detect file type from URL
    if (url.toLowerCase().includes('.pdf')) {
      setFileType('pdf');
    } else if (url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      setFileType('image');
    }
  };

  const uploadToFirebaseStorage = async (file, folder = 'identity_proofs') => {
    if (!storage) {
      throw new Error('Firebase Storage not initialized');
    }

    // Create a unique filename with timestamp
    const timestamp = Date.now();
    const fileName = `${folder}/${timestamp}_${file.name}`;
    const storageRef = ref(storage, fileName);

    // Upload the file
    const snapshot = await uploadBytes(storageRef, file);

    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);

    return {
      url: downloadURL,
      path: fileName,
      name: file.name,
      type: file.type,
      size: file.size
    };
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file size
    if (file.size > maxSize) {
      toast.error(`File size must be less than ${Math.round(maxSize / (1024 * 1024))}MB`);
      return;
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please select an image (JPG, PNG, GIF, WebP) or PDF file');
      return;
    }

    // Set file type for preview
    setFileType(file.type === 'application/pdf' ? 'pdf' : 'image');

    setUploading(true);

    try {
      // Upload to Firebase Storage
      toast.info(`Uploading ${file.type === 'application/pdf' ? 'PDF' : 'image'}...`);
      const uploadResult = await uploadToFirebaseStorage(file, 'identity_proofs');

      console.log('Firebase Storage upload successful:', uploadResult);
      setPreview(uploadResult.url);
      onChange(uploadResult.url);
      toast.success(`✅ ${file.type === 'application/pdf' ? 'PDF' : 'Image'} uploaded successfully!`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload document: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const clearDocument = () => {
    setPreview('');
    setFileType(null);
    onChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <Label>{label} {required && <span className="text-red-500">*</span>}</Label>

      {/* URL Input */}
      <div className="flex space-x-2">
        <div className="flex-1 relative">
          <Link className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
          <Input
            type="url"
            value={value || ''}
            onChange={(e) => handleUrlChange(e.target.value)}
            placeholder={placeholder}
            className="pl-10"
            required={required}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="px-3"
          title="Upload to Cloudinary"
        >
          {uploading ? (
            <div className="w-4 h-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
          ) : (
            <Cloud className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Document Preview */}
      {preview && (
        <div className="relative inline-block">
          <div className="relative w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg overflow-hidden bg-gray-50">
            {fileType === 'pdf' || preview.toLowerCase().includes('.pdf') ? (
              <div className="w-full h-full flex flex-col items-center justify-center p-2">
                <FileText className="w-12 h-12 text-red-500 mb-2" />
                <span className="text-xs text-gray-600 text-center">PDF Document</span>
              </div>
            ) : preview.startsWith('data:') || preview.startsWith('http') ? (
              <img
                src={preview}
                alt="Preview"
                className="w-full h-full object-cover"
                onError={() => {
                  setPreview('');
                  toast.error('Failed to load document');
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="w-8 h-8 text-gray-400" />
              </div>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={clearDocument}
            className="absolute -top-2 -right-2 w-6 h-6 p-0 rounded-full bg-red-500 hover:bg-red-600 text-white border-red-500"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      )}

      {uploading && (
        <div className="flex items-center space-x-2 text-sm text-blue-600">
          <div className="w-4 h-4 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600"></div>
          <span>Uploading to Cloudinary...</span>
        </div>
      )}

      <p className="text-xs text-gray-500">
        Accepts: Images (JPG, PNG, GIF, WebP) or PDF files (max {Math.round(maxSize / (1024 * 1024))}MB)
      </p>
    </div>
  );
};

export default DocumentUpload;
