import { v2 as cloudinary } from 'cloudinary';

export const CloudinaryProvider = {
  provide: 'CLOUDINARY',
  useFactory: () => {
    let cloud_name = process.env.CLOUDINARY_CLOUD_NAME;
    let api_key = process.env.CLOUDINARY_API_KEY;
    let api_secret = process.env.CLOUDINARY_API_SECRET;

    if (process.env.CLOUDINARY_URL) {
      try {
        const parsed = new URL(process.env.CLOUDINARY_URL);
        if (parsed.hostname && parsed.username && parsed.password) {
          cloud_name = parsed.hostname;
          api_key = parsed.username;
          api_secret = parsed.password;
        }
      } catch (_) {}
    }

    return cloudinary.config({
      cloud_name,
      api_key,
      api_secret,
      secure: true,
    });
  },
};
