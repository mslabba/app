import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, X, Image as ImageIcon, Link, Shuffle, Cloud } from 'lucide-react';
import { toast } from 'sonner';
import { getRandomSampleImage } from '@/utils/sampleImages';
import { uploadImageToCloudinary } from '@/lib/cloudinary';

const ImageUpload = ({
  label,
  value,
  onChange,
  placeholder = "Enter image URL or upload file",
  accept = "image/*",
  maxSize = 5 * 1024 * 1024, // 5MB default
  className = "",
  sampleType = null, // e.g., { type: 'events', subtype: 'logos' }
  showSample = true
}) => {
  const [preview, setPreview] = useState(value || '');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleUrlChange = (url) => {
    setPreview(url);
    onChange(url);
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
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    setUploading(true);

    try {
      // Try Cloudinary upload first
      try {
        toast.info('Uploading to Cloudinary...');
        const folder = sampleType ? `${sampleType.type}/${sampleType.subtype || 'images'}` : 'general';
        const uploadResult = await uploadImageToCloudinary(file, folder);
        
        console.log('Cloudinary upload successful:', uploadResult);
        setPreview(uploadResult.url);
        onChange(uploadResult.url);
        toast.success('✅ Image uploaded to Cloudinary!');
        return;
      } catch (cloudinaryError) {
        console.warn('Cloudinary upload failed, falling back to base64:', cloudinaryError);
        toast.warning('Cloudinary unavailable, using fallback method...');
      }

      // Fallback to base64 if Cloudinary fails
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target.result;
        setPreview(dataUrl);
        onChange(dataUrl);
        toast.success('📎 Image uploaded (fallback method)');
      };
      reader.onerror = () => {
        throw new Error('Failed to read file');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const clearImage = () => {
    setPreview('');
    onChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const useSampleImage = () => {
    if (!sampleType) return;
    const sampleUrl = getRandomSampleImage(sampleType.type, sampleType.subtype);
    if (sampleUrl) {
      handleUrlChange(sampleUrl);
      toast.success('Sample image loaded!');
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <Label>{label}</Label>

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
        {showSample && sampleType && (
          <Button
            type="button"
            variant="outline"
            onClick={useSampleImage}
            className="px-3"
            title="Use sample image"
          >
            <Shuffle className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Image Preview */}
      {preview && (
        <div className="relative inline-block">
          <div className="relative w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg overflow-hidden bg-gray-50">
            {preview.startsWith('data:') || preview.startsWith('http') ? (
              <img
                src={preview}
                alt="Preview"
                className="w-full h-full object-cover"
                onError={() => {
                  setPreview('');
                  toast.error('Failed to load image');
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
            onClick={clearImage}
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
    </div>
  );
};

export default ImageUpload;
