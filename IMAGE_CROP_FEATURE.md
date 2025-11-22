# Image Crop Feature for Player Registration

## Overview
The player registration form now includes an image cropping feature that allows players to select the correct square area where their face is clearly visible. This ensures consistent and professional-looking player photos across the platform.

## Implementation Details

### Components Created

1. **ImageCropper.jsx** (`/frontend/src/components/ImageCropper.jsx`)
   - Standalone image cropper component
   - Uses `react-image-crop` library
   - Provides a dialog-based interface for cropping images
   - Supports customizable aspect ratios (default: 1:1 square)

2. **ImageUploadWithCrop.jsx** (`/frontend/src/components/ImageUploadWithCrop.jsx`)
   - Enhanced version of the original ImageUpload component
   - Integrates cropping functionality
   - Maintains backward compatibility with the original ImageUpload
   - Can be toggled on/off with the `enableCrop` prop

### Features

- **Crop Dialog**: Opens a modal dialog when an image is selected
- **Square Crop**: Default aspect ratio is 1:1 for consistent player photos
- **Drag to Select**: Users can drag to select the area containing their face
- **Live Preview**: Shows a real-time preview of the cropped area
- **Cloudinary Upload**: Uploads the cropped image to Cloudinary automatically
- **Fallback Support**: Falls back to base64 encoding if Cloudinary is unavailable
- **Validation**: Validates file size (max 5MB) and file type (images only)

### Usage

The feature is enabled in the PublicPlayerRegistration page:

```jsx
<ImageUploadWithCrop
  label="Upload Your Photo"
  value={formData.photo_url}
  onChange={(url) => handleChange('photo_url', url)}
  placeholder="Upload your photo or enter URL"
  sampleType={{ type: 'players', subtype: 'photos' }}
  enableCrop={true}      // Enable cropping
  cropAspect={1}         // 1:1 square crop
/>
```

### Props

#### ImageUploadWithCrop

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | string | - | Label text for the upload field |
| `value` | string | - | Current image URL |
| `onChange` | function | - | Callback when image changes |
| `placeholder` | string | "Enter image URL or upload file" | Placeholder text |
| `accept` | string | "image/*" | Accepted file types |
| `maxSize` | number | 5242880 (5MB) | Maximum file size in bytes |
| `className` | string | "" | Additional CSS classes |
| `sampleType` | object | null | Sample image configuration |
| `showSample` | boolean | true | Show sample image button |
| `enableCrop` | boolean | false | Enable cropping functionality |
| `cropAspect` | number | 1 | Aspect ratio for crop (1 = square) |

### User Experience

1. **Select Image**: Player clicks the upload button (with crop icon)
2. **Choose File**: Player selects an image from their device
3. **Crop Dialog Opens**: A modal dialog appears with the selected image
4. **Adjust Crop Area**: Player drags to select the area containing their face
5. **Apply Crop**: Player clicks "Apply Crop & Upload"
6. **Upload**: The cropped image is automatically uploaded to Cloudinary
7. **Preview**: The cropped image appears as a preview in the form

### Dependencies

- `react-image-crop`: ^11.0.7 (or latest version)
- React 19.0.0
- Radix UI Dialog component
- Cloudinary integration

### Installation

The feature is already installed and configured. If you need to reinstall:

```bash
cd frontend
npm install react-image-crop --legacy-peer-deps
```

### Testing

1. Navigate to the player registration form
2. Click the upload button (should show a crop icon)
3. Select an image from your device
4. Verify the crop dialog opens
5. Drag to select a crop area
6. Click "Apply Crop & Upload"
7. Verify the cropped image is uploaded and displayed

### Future Enhancements

- Add circular crop option for profile photos
- Add zoom controls for better precision
- Add rotation controls
- Add filters or adjustments (brightness, contrast)
- Support multiple aspect ratios (16:9, 4:3, etc.)

## Files Modified

- `/frontend/src/pages/PublicPlayerRegistration.jsx` - Updated to use ImageUploadWithCrop
- `/frontend/src/components/ImageUploadWithCrop.jsx` - New component with crop functionality
- `/frontend/src/components/ImageCropper.jsx` - Standalone cropper component
- `/frontend/package.json` - Added react-image-crop dependency

## Notes

- The original `ImageUpload.jsx` component is preserved for backward compatibility
- The crop feature can be easily enabled/disabled with the `enableCrop` prop
- Images are uploaded to Cloudinary after cropping for optimal performance
- The feature works on both desktop and mobile devices
