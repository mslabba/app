import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Upload, X, Image as ImageIcon, Link, Shuffle, Cloud, Crop } from 'lucide-react';
import { toast } from 'sonner';
import { getRandomSampleImage } from '@/utils/sampleImages';
import { uploadImageToCloudinary } from '@/lib/cloudinary';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

const ImageUploadWithCrop = ({
  label,
  value,
  onChange,
  placeholder = "Enter image URL or upload file",
  accept = "image/*",
  maxSize = 5 * 1024 * 1024, // 5MB default
  className = "",
  sampleType = null, // e.g., { type: 'events', subtype: 'logos' }
  showSample = true,
  enableCrop = false, // Enable cropping functionality
  cropAspect = 1 // Default to square crop
}) => {
  const [preview, setPreview] = useState(value || '');
  const [uploading, setUploading] = useState(false);
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({
    unit: '%',
    width: 90,
    aspect: cropAspect
  });
  const [completedCrop, setCompletedCrop] = useState(null);
  const imgRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleUrlChange = (url) => {
    setPreview(url);
    onChange(url);
  };

  const getCroppedImage = useCallback(() => {
    if (!completedCrop || !imgRef.current) {
      return null;
    }

    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    // Set canvas size to the cropped area
    canvas.width = completedCrop.width * scaleX;
    canvas.height = completedCrop.height * scaleY;

    const ctx = canvas.getContext('2d');

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
    );

    return canvas;
  }, [completedCrop]);

  const handleCropComplete = useCallback(async () => {
    if (!completedCrop || !imgRef.current) {
      toast.error('Please select a crop area');
      return;
    }

    try {
      const canvas = getCroppedImage();
      if (!canvas) {
        toast.error('Failed to crop image');
        return;
      }

      setUploading(true);

      // Convert canvas to blob
      canvas.toBlob(async (blob) => {
        if (!blob) {
          toast.error('Failed to create image blob');
          setUploading(false);
          return;
        }

        // Convert blob to file
        const croppedFile = new File([blob], 'cropped-image.jpg', { type: 'image/jpeg' });

        // Try to upload to Cloudinary
        try {
          toast.info('Uploading cropped image to Cloudinary...');
          const folder = sampleType ? `${sampleType.type}/${sampleType.subtype || 'images'}` : 'general';
          const uploadResult = await uploadImageToCloudinary(croppedFile, folder);

          console.log('Cloudinary upload successful:', uploadResult);
          setPreview(uploadResult.url);
          onChange(uploadResult.url);
          toast.success('✅ Cropped image uploaded to Cloudinary!');
        } catch (cloudinaryError) {
          console.warn('Cloudinary upload failed, using base64:', cloudinaryError);

          // Fallback to base64
          const reader = new FileReader();
          reader.onload = (e) => {
            const dataUrl = e.target.result;
            setPreview(dataUrl);
            onChange(dataUrl);
            toast.success('📎 Cropped image saved (fallback method)');
          };
          reader.readAsDataURL(blob);
        } finally {
          setUploading(false);
          setShowCropDialog(false);
          setImageSrc(null);
        }
      }, 'image/jpeg', 0.95);
    } catch (error) {
      console.error('Crop error:', error);
      toast.error('Failed to crop image: ' + error.message);
      setUploading(false);
    }
  }, [completedCrop, getCroppedImage, onChange, sampleType]);

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

    // If crop is enabled, show crop dialog
    if (enableCrop) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImageSrc(e.target.result);
        setShowCropDialog(true);
      };
      reader.readAsDataURL(file);
      return;
    }

    // Otherwise, upload directly
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

  const handleCropCancel = () => {
    setShowCropDialog(false);
    setImageSrc(null);
    setCrop({
      unit: '%',
      width: 90,
      aspect: cropAspect
    });
    setCompletedCrop(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
          title={enableCrop ? "Upload & Crop" : "Upload to Cloudinary"}
        >
          {uploading ? (
            <div className="w-4 h-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
          ) : enableCrop ? (
            <Crop className="w-4 h-4" />
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
          <span>{enableCrop ? 'Processing cropped image...' : 'Uploading to Cloudinary...'}</span>
        </div>
      )}

      {/* Crop Dialog */}
      {enableCrop && (
        <Dialog open={showCropDialog} onOpenChange={setShowCropDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Crop className="w-5 h-5 mr-2" />
                Crop Your Photo
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Drag to select the area where your face is clearly visible. The image will be cropped to a square format for best results.
              </p>

              {imageSrc && (
                <div className="flex justify-center bg-gray-50 p-4 rounded-lg">
                  <ReactCrop
                    crop={crop}
                    onChange={(c) => setCrop(c)}
                    onComplete={(c) => setCompletedCrop(c)}
                    aspect={cropAspect}
                    circularCrop={false}
                  >
                    <img
                      ref={imgRef}
                      src={imageSrc}
                      alt="Crop preview"
                      style={{ maxHeight: '60vh', maxWidth: '100%' }}
                    />
                  </ReactCrop>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCropCancel}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleCropComplete}
                disabled={uploading}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {uploading ? (
                  <>
                    <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    <Crop className="w-4 h-4 mr-2" />
                    Apply Crop & Upload
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default ImageUploadWithCrop;
