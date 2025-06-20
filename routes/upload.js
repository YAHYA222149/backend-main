const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticate } = require('../middleware/auth');
const cloudinary = require('../config/cloudinary');

// Multer memory storage (store file in RAM buffer)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // max 100MB for both images and videos (adjust if you want)
  },
  fileFilter: (req, file, cb) => {
    const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const allowedVideoTypes = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska', 'video/webm'];

    if (allowedImageTypes.includes(file.mimetype) || allowedVideoTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type. Allowed: Images (JPG, PNG, GIF, WEBP), Videos (MP4, MOV, AVI, MKV, WEBM)'));
    }
  }
});

// Upload single image
router.post('/image', authenticate, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file received' });
    }

    // Upload buffer to Cloudinary, specifying folder and resource type
    const result = await cloudinary.uploader.upload_stream({
      folder: 'uploads/images',
      resource_type: 'image',
      public_id: `image-${Date.now()}`,
    }, (error, result) => {
      if (error) {
        throw error;
      }
      res.status(201).json({
        success: true,
        message: 'Image uploaded successfully',
        data: {
          url: result.secure_url,
          public_id: result.public_id,
          format: result.format,
          size: result.bytes,
        }
      });
    });

    // Pipe the buffer to Cloudinary upload stream
    const stream = cloudinary.uploader.upload_stream({
      folder: 'uploads/images',
      resource_type: 'image',
      public_id: `image-${Date.now()}`,
    }, (error, result) => {
      if (error) return res.status(500).json({ success: false, message: error.message });
      return res.status(201).json({
        success: true,
        message: 'Image uploaded successfully',
        data: {
          url: result.secure_url,
          public_id: result.public_id,
          format: result.format,
          size: result.bytes,
        }
      });
    });

    stream.end(req.file.buffer);

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Upload single video
router.post('/video', authenticate, upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No video file received' });
    }

    const stream = cloudinary.uploader.upload_stream({
      folder: 'uploads/videos',
      resource_type: 'video',
      public_id: `video-${Date.now()}`,
    }, (error, result) => {
      if (error) return res.status(500).json({ success: false, message: error.message });
      return res.status(201).json({
        success: true,
        message: 'Video uploaded successfully',
        data: {
          url: result.secure_url,
          public_id: result.public_id,
          format: result.format,
          size: result.bytes,
        }
      });
    });

    stream.end(req.file.buffer);

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
