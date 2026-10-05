import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

export const uploadBuffer = (buffer, options) =>
  new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(options, (err, result) => (err ? reject(err) : resolve(result)))
      .end(buffer);
  });

export const getSignedAssetUrl = ({ publicId, resourceType, format }) =>
  cloudinary.utils.private_download_url(publicId, format || '', {
    resource_type: resourceType,
    type: 'authenticated',
    expires_at: Math.floor(Date.now() / 1000) + 300 
  });

export const deleteAsset = (publicId, resourceType = 'image') =>
  cloudinary.uploader.destroy(publicId, { resource_type: resourceType, type: 'authenticated' });

export default cloudinary;