import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import ImageUpload from '@/components/ImageUpload';
import { toast } from 'sonner';
import {
  uploadImageToCloudinary,
  getOptimizedImageUrl,
  getThumbnailUrl,
  getResponsiveImageUrls,
  extractPublicIdFromUrl
} from '@/lib/cloudinary';

const CloudinaryTest = () => {
  const [testImageUrl, setTestImageUrl] = useState('');
  const [publicId, setPublicId] = useState('');
  const [responsiveUrls, setResponsiveUrls] = useState(null);

  const handleImageUpload = (url) => {
    setTestImageUrl(url);
    const extractedPublicId = extractPublicIdFromUrl(url);
    setPublicId(extractedPublicId);

    if (extractedPublicId) {
      const responsive = getResponsiveImageUrls(extractedPublicId);
      setResponsiveUrls(responsive);
    }

    console.log('Image uploaded:', url);
    console.log('Public ID:', extractedPublicId);
  };

  const testDirectUpload = async (file) => {
    try {
      toast.info('Testing direct Cloudinary upload...');
      const result = await uploadImageToCloudinary(file, 'test');
      console.log('Direct upload result:', result);
      toast.success('Direct upload successful!');
      return result;
    } catch (error) {
      console.error('Direct upload failed:', error);
      toast.error('Direct upload failed: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>☁️ Cloudinary Integration Test</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <strong>Cloud Name:</strong>
                <p className="text-sm">{process.env.REACT_APP_CLOUDINARY_CLOUD_NAME || 'Not configured'}</p>
              </div>
              <div>
                <strong>API Key:</strong>
                <p className="text-sm">{process.env.REACT_APP_CLOUDINARY_API_KEY ? 'Configured' : 'Not configured'}</p>
              </div>
              <div>
                <strong>Upload Preset:</strong>
                <p className="text-sm">{process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET || 'auction_uploads'}</p>
              </div>
              <div>
                <strong>Upload URL:</strong>
                <p className="text-xs text-gray-600 break-all">
                  {`https://api.cloudinary.com/v1_1/${process.env.REACT_APP_CLOUDINARY_CLOUD_NAME}/image/upload`}
                </p>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">Test Image Upload</h3>
              <ImageUpload
                label="Upload Test Image to Cloudinary"
                value={testImageUrl}
                onChange={handleImageUpload}
                placeholder="Test Cloudinary upload"
                sampleType={{ type: 'test', subtype: 'images' }}
              />
            </div>

            {testImageUrl && (
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Upload Result</h3>
                <div className="space-y-4">
                  <div>
                    <strong>Original URL:</strong>
                    <a
                      href={testImageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline ml-2 break-all text-sm"
                    >
                      {testImageUrl}
                    </a>
                  </div>

                  {publicId && (
                    <div>
                      <strong>Public ID:</strong>
                      <code className="ml-2 px-2 py-1 bg-gray-100 rounded text-sm">{publicId}</code>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <strong>Original Image:</strong>
                      <div className="mt-2">
                        <img
                          src={testImageUrl}
                          alt="Uploaded original"
                          className="w-full max-w-sm h-auto rounded-lg shadow-md"
                          onLoad={() => toast.success('✅ Original image loaded from Cloudinary!')}
                          onError={() => toast.error('❌ Failed to load image from Cloudinary')}
                        />
                      </div>
                    </div>

                    {publicId && (
                      <div>
                        <strong>Optimized Thumbnail:</strong>
                        <div className="mt-2">
                          <img
                            src={getThumbnailUrl(publicId, 200)}
                            alt="Optimized thumbnail"
                            className="w-48 h-48 object-cover rounded-lg shadow-md"
                            onLoad={() => console.log('Thumbnail loaded')}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {responsiveUrls && (
                    <div>
                      <strong>Responsive Image URLs:</strong>
                      <div className="mt-2 space-y-1 text-sm">
                        <div><strong>Thumbnail:</strong> <span className="text-blue-600 break-all">{responsiveUrls.thumbnail}</span></div>
                        <div><strong>Small:</strong> <span className="text-blue-600 break-all">{responsiveUrls.small}</span></div>
                        <div><strong>Medium:</strong> <span className="text-blue-600 break-all">{responsiveUrls.medium}</span></div>
                        <div><strong>Large:</strong> <span className="text-blue-600 break-all">{responsiveUrls.large}</span></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">Test Actions</h3>
              <div className="space-x-2 space-y-2">
                <Button
                  onClick={() => {
                    console.log('Cloudinary config:', {
                      cloudName: process.env.REACT_APP_CLOUDINARY_CLOUD_NAME,
                      apiKey: process.env.REACT_APP_CLOUDINARY_API_KEY,
                      uploadPreset: process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET
                    });
                    toast.info('Check browser console for Cloudinary config');
                  }}
                  variant="outline"
                >
                  🔍 Debug Config
                </Button>
                <Button
                  onClick={() => {
                    setTestImageUrl('');
                    setPublicId('');
                    setResponsiveUrls(null);
                    toast.info('Test cleared');
                  }}
                  variant="outline"
                >
                  🗑️ Clear Test
                </Button>
                <Button
                  onClick={async () => {
                    // Create a test file from canvas
                    const canvas = document.createElement('canvas');
                    canvas.width = 100;
                    canvas.height = 100;
                    const ctx = canvas.getContext('2d');
                    ctx.fillStyle = '#FF6B6B';
                    ctx.fillRect(0, 0, 100, 100);
                    ctx.fillStyle = 'white';
                    ctx.font = '16px Arial';
                    ctx.fillText('TEST', 30, 55);

                    canvas.toBlob(async (blob) => {
                      const testFile = new File([blob], 'test.png', { type: 'image/png' });
                      await testDirectUpload(testFile);
                    });
                  }}
                  variant="outline"
                >
                  🧪 Test Direct Upload
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-600 space-y-2">
              <p><strong>Expected Behavior:</strong></p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Images should upload to Cloudinary (not base64)</li>
                <li>URLs should start with: <code>https://res.cloudinary.com</code></li>
                <li>Images should be automatically optimized</li>
                <li>Multiple sizes should be generated automatically</li>
                <li>Upload should be faster than base64 method</li>
              </ul>
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
                <p><strong>⚠️ Setup Required:</strong></p>
                <p>You need to create an upload preset in Cloudinary dashboard:</p>
                <ol className="list-decimal pl-5 mt-2 space-y-1">
                  <li>Go to Cloudinary Console → Settings → Upload</li>
                  <li>Add upload preset named: <code>auction_uploads</code></li>
                  <li>Set signing mode to: <strong>Unsigned</strong></li>
                  <li>Configure folder and transformations as needed</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CloudinaryTest;