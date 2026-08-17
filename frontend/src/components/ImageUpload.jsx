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
  labelClassName = "",
  /** dark = readable on glass/dark admin surfaces */
  variant = "default",
  /** Preview fit: cover (crop) or contain (full logo, good for rectangular) */
  objectFit = "cover",
  sampleType = null, // e.g., { type: 'events', subtype: 'logos' }
  showSample = true
}) => {
  const isDark = variant === 'dark';
  const fitClass = objectFit === 'contain' ? 'object-contain' : 'object-cover';
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
      <Label className={labelClassName || (isDark ? 'text-white/85' : undefined)}>
        {label}
      </Label>

      {/* URL Input */}
      <div className="flex space-x-2">
        <div className="flex-1 relative">
          <Link className={`absolute left-3 top-3 w-4 h-4 ${isDark ? 'text-white/40' : 'text-gray-400'}`} />
          <Input
            type="url"
            value={value || ''}
            onChange={(e) => handleUrlChange(e.target.value)}
            placeholder={placeholder}
            className={
              isDark
                ? 'border-white/20 bg-white/5 pl-10 text-white placeholder:text-white/35'
                : 'pl-10'
            }
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className={
            isDark
              ? 'border-white/20 bg-white/5 px-3 text-white hover:bg-white/10'
              : 'px-3'
          }
          title="Upload to Cloudinary"
        >
          {uploading ? (
            <div className={`w-4 h-4 animate-spin rounded-full border-2 ${isDark ? 'border-white/20 border-t-white' : 'border-gray-300 border-t-blue-600'}`}></div>
          ) : (
            <Cloud className="w-4 h-4" />
          )}
        </Button>
        {showSample && sampleType && (
          <Button
            type="button"
            variant="outline"
            onClick={useSampleImage}
            className={
              isDark
                ? 'border-white/20 bg-white/5 px-3 text-white hover:bg-white/10'
                : 'px-3'
            }
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
          <div
            className={
              isDark
                ? `relative overflow-hidden rounded-lg border-2 border-dashed border-white/20 bg-white/5 ${
                    objectFit === 'contain' ? 'h-28 w-48' : 'h-32 w-32'
                  }`
                : `relative overflow-hidden rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 ${
                    objectFit === 'contain' ? 'h-28 w-48' : 'h-32 w-32'
                  }`
            }
          >
            {preview.startsWith('data:') || preview.startsWith('http') ? (
              <img
                src={preview}
                alt="Preview"
                className={`h-full w-full ${fitClass}`}
                onError={() => {
                  setPreview('');
                  toast.error('Failed to load image');
                }}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <ImageIcon className={`h-8 w-8 ${isDark ? 'text-white/40' : 'text-gray-400'}`} />
              </div>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={clearImage}
            className="absolute -right-2 -top-2 h-6 w-6 rounded-full border-red-500 bg-red-500 p-0 text-white hover:bg-red-600"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {uploading && (
        <div className={`flex items-center space-x-2 text-sm ${isDark ? 'text-red-200' : 'text-blue-600'}`}>
          <div
            className={`h-4 w-4 animate-spin rounded-full border-2 ${
              isDark ? 'border-white/20 border-t-white' : 'border-blue-200 border-t-blue-600'
            }`}
          />
          <span>Uploading to Cloudinary...</span>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;
