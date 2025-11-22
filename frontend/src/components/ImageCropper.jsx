import { useState, useRef, useCallback } from 'react';
import ReactCrop from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Upload, Crop, X } from 'lucide-react';
import { toast } from 'sonner';

const ImageCropper = ({
  label = "Upload Image",
  value,
  onChange,
  onImageCropped,
  aspect = 1, // Default to square crop (1:1)
  maxSize = 5 * 1024 * 1024, // 5MB default
  className = ""
}) => {
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({
    unit: '%',
    width: 90,
    aspect: aspect
  });
  const [completedCrop, setCompletedCrop] = useState(null);
  const imgRef = useRef(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = (event) => {
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

    // Read the file and show crop dialog
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageSrc(e.target.result);
      setShowCropDialog(true);
    };
    reader.readAsDataURL(file);
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

      // Convert canvas to blob
      canvas.toBlob((blob) => {
        if (!blob) {
          toast.error('Failed to create image blob');
          return;
        }

        // Convert blob to file
        const croppedFile = new File([blob], 'cropped-image.jpg', { type: 'image/jpeg' });

        // Convert to base64 data URL for preview
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target.result;
          onChange(dataUrl);
          if (onImageCropped) {
            onImageCropped(croppedFile, dataUrl);
          }
          setShowCropDialog(false);
          setImageSrc(null);
          toast.success('Image cropped successfully!');
        };
        reader.readAsDataURL(blob);
      }, 'image/jpeg', 0.95);
    } catch (error) {
      console.error('Crop error:', error);
      toast.error('Failed to crop image: ' + error.message);
    }
  }, [completedCrop, getCroppedImage, onChange, onImageCropped]);

  const handleCropCancel = () => {
    setShowCropDialog(false);
    setImageSrc(null);
    setCrop({
      unit: '%',
      width: 90,
      aspect: aspect
    });
    setCompletedCrop(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const clearImage = () => {
    onChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      <Label>{label}</Label>

      {/* Upload Button */}
      <div className="flex space-x-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          className="flex-1"
        >
          <Upload className="w-4 h-4 mr-2" />
          Select Image to Crop
        </Button>
        {value && (
          <Button
            type="button"
            variant="outline"
            onClick={clearImage}
            className="px-3"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Image Preview */}
      {value && (
        <div className="relative inline-block">
          <div className="relative w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg overflow-hidden bg-gray-50">
            <img
              src={value}
              alt="Cropped preview"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      )}

      {/* Crop Dialog */}
      <Dialog open={showCropDialog} onOpenChange={setShowCropDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Crop className="w-5 h-5 mr-2" />
              Crop Your Image
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Drag to select the area containing your face. The image will be cropped to a square format.
            </p>

            {imageSrc && (
              <div className="flex justify-center bg-gray-50 p-4 rounded-lg">
                <ReactCrop
                  crop={crop}
                  onChange={(c) => setCrop(c)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={aspect}
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
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <Crop className="w-4 h-4 mr-2" />
              Apply Crop
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ImageCropper;
