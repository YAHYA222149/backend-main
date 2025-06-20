const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticate } = require('../middleware/auth');

// ===============================
// MULTER CONFIGURATION
// ===============================

// Créer les dossiers uploads s'ils n'existent pas
const uploadDir = path.join(__dirname, '..', 'uploads');
const imagesDir = path.join(uploadDir, 'images');
const videosDir = path.join(uploadDir, 'videos');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('📁 Created uploads directory');
}

if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
  console.log('📁 Created uploads/images directory');
}

if (!fs.existsSync(videosDir)) {
  fs.mkdirSync(videosDir, { recursive: true });
  console.log('📁 Created uploads/videos directory');
}

// Configuration du stockage pour les images
const imageStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, imagesDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    const filename = `image-${uniqueSuffix}${extension}`;
    
    console.log('📝 Generating image filename:', filename);
    cb(null, filename);
  }
});

// Configuration du stockage pour les vidéos
const videoStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, videosDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    const filename = `video-${uniqueSuffix}${extension}`;
    
    console.log('📝 Generating video filename:', filename);
    cb(null, filename);
  }
});

// Filtre pour les types d'images autorisés
const imageFileFilter = (req, file, cb) => {
  console.log('🔍 Checking image file type:', file.mimetype);
  
  const allowedImageTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp'
  ];
  
  if (allowedImageTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Type de fichier image non autorisé. Utilisez: JPG, PNG, GIF, WEBP'), false);
  }
};

// Filtre pour les types de vidéos autorisés
const videoFileFilter = (req, file, cb) => {
  console.log('🔍 Checking video file type:', file.mimetype);
  
  const allowedVideoTypes = [
    'video/mp4',
    'video/mpeg',
    'video/quicktime', // .mov
    'video/x-msvideo', // .avi
    'video/x-matroska', // .mkv
    'video/webm'
  ];
  
  if (allowedVideoTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Type de fichier vidéo non autorisé. Utilisez: MP4, MOV, AVI, MKV, WEBM'), false);
  }
};

// Configuration de multer pour les images
const uploadImage = multer({
  storage: imageStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max pour les images
    files: 1
  },
  fileFilter: imageFileFilter
});

// Configuration de multer pour les vidéos
const uploadVideo = multer({
  storage: videoStorage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max pour les vidéos
    files: 1
  },
  fileFilter: videoFileFilter
});

// ===============================
// ROUTES D'UPLOAD IMAGES
// ===============================

// @route   POST /api/upload/image
// @desc    Upload a single image
// @access  Private (authenticated users only)
router.post('/image', authenticate, uploadImage.single('image'), async (req, res) => {
  try {
    console.log('📤 ===== IMAGE UPLOAD REQUEST =====');
    console.log('👤 User:', req.user?.email);
    console.log('📁 File info:', req.file);
    console.log('📄 Body:', req.body);

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Aucun fichier reçu'
      });
    }

    // Récupérer les informations du fichier
    const {
      filename,
      originalname,
      mimetype,
      size,
      path: filePath
    } = req.file;

    // Alt text depuis le body ou nom original
    const alt = req.body.alt || originalname || 'Image uploadée';

    // Construire l'URL publique
    const imageUrl = `${req.protocol}://${req.get('host')}/uploads/images/${filename}`;

    // ✅ STRUCTURE DE RÉPONSE COMPATIBLE AVEC LE FRONTEND
    const imageData = {
      url: imageUrl,
      alt: alt,
      type: 'image',
      isUploaded: true,
      uploadedAt: new Date(),
      filename: filename,
      originalname: originalname,
      mimetype: mimetype,
      size: size,
      path: filePath
    };

    console.log('✅ ===== IMAGE UPLOADED SUCCESSFULLY =====');
    console.log('🌐 URL:', imageUrl);
    console.log('📏 Size:', size, 'bytes');
    console.log('📝 Alt:', alt);

    res.status(201).json({
      success: true,
      message: 'Image uploadée avec succès',
      data: imageData
    });

  } catch (error) {
    console.error('❌ ===== IMAGE UPLOAD ERROR =====');
    console.error('❌ Error details:', error);

    // Supprimer le fichier si une erreur survient après l'upload
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
        console.log('🗑️ Deleted failed upload file');
      } catch (deleteError) {
        console.error('❌ Error deleting file:', deleteError);
      }
    }

    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'upload de l\'image',
      error: error.message
    });
  }
});

// @route   POST /api/upload/multiple
// @desc    Upload multiple images (up to 5)
// @access  Private (authenticated users only)
router.post('/multiple', authenticate, uploadImage.array('images', 5), async (req, res) => {
  try {
    console.log('📤 ===== MULTIPLE IMAGES UPLOAD REQUEST =====');
    console.log('👤 User:', req.user?.email);
    console.log('📁 Files count:', req.files?.length || 0);

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Aucun fichier reçu'
      });
    }

    const uploadedImages = [];

    // Traiter chaque fichier
    req.files.forEach((file, index) => {
      const imageUrl = `${req.protocol}://${req.get('host')}/uploads/images/${file.filename}`;
      const alt = req.body.alt || file.originalname || `Image ${index + 1}`;

      const imageData = {
        url: imageUrl,
        alt: alt,
        type: 'image',
        isUploaded: true,
        uploadedAt: new Date(),
        filename: file.filename,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        path: file.path
      };

      uploadedImages.push(imageData);
    });

    console.log('✅ ===== MULTIPLE IMAGES UPLOADED SUCCESSFULLY =====');
    console.log('📊 Count:', uploadedImages.length);

    res.status(201).json({
      success: true,
      message: `${uploadedImages.length} image(s) uploadée(s) avec succès`,
      data: uploadedImages
    });

  } catch (error) {
    console.error('❌ ===== MULTIPLE IMAGES UPLOAD ERROR =====');
    console.error('❌ Error details:', error);

    // Supprimer les fichiers si une erreur survient
    if (req.files) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          try {
            fs.unlinkSync(file.path);
            console.log('🗑️ Deleted failed upload file:', file.filename);
          } catch (deleteError) {
            console.error('❌ Error deleting file:', deleteError);
          }
        }
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'upload des images',
      error: error.message
    });
  }
});

// @route   DELETE /api/upload/image/:filename
// @desc    Delete an uploaded image
// @access  Private (authenticated users only)
router.delete('/image/:filename', authenticate, async (req, res) => {
  try {
    console.log('🗑️ ===== DELETE IMAGE REQUEST =====');
    console.log('👤 User:', req.user?.email);
    console.log('📁 Filename:', req.params.filename);

    const filename = req.params.filename;
    const filePath = path.join(imagesDir, filename);

    // Vérifier si le fichier existe
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Fichier non trouvé'
      });
    }

    // Supprimer le fichier
    fs.unlinkSync(filePath);

    console.log('✅ Image deleted successfully:', filename);

    res.json({
      success: true,
      message: 'Image supprimée avec succès'
    });

  } catch (error) {
    console.error('❌ ===== DELETE IMAGE ERROR =====');
    console.error('❌ Error details:', error);

    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de l\'image',
      error: error.message
    });
  }
});

// ===============================
// ROUTES D'UPLOAD VIDÉO
// ===============================

// @route   POST /api/upload/video
// @desc    Upload a single video
// @access  Private (authenticated users only)
router.post('/video', authenticate, uploadVideo.single('video'), async (req, res) => {
  try {
    console.log('📤 ===== VIDEO UPLOAD REQUEST =====');
    console.log('👤 User:', req.user?.email);
    console.log('📁 File info:', req.file);
    console.log('📄 Body:', req.body);

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Aucun fichier vidéo reçu'
      });
    }

    // Récupérer les informations du fichier
    const {
      filename,
      originalname,
      mimetype,
      size,
      path: filePath
    } = req.file;

    // Alt text depuis le body ou nom original
    const alt = req.body.alt || originalname || 'Vidéo uploadée';

    // Construire l'URL publique
    const videoUrl = `${req.protocol}://${req.get('host')}/uploads/videos/${filename}`;

    // ✅ STRUCTURE DE RÉPONSE COMPATIBLE AVEC LE FRONTEND
    const videoData = {
      url: videoUrl,
      alt: alt,
      type: 'video',
      isUploaded: true,
      uploadedAt: new Date(),
      filename: filename,
      originalname: originalname,
      mimetype: mimetype,
      size: size,
      path: filePath
    };

    console.log('✅ ===== VIDEO UPLOADED SUCCESSFULLY =====');
    console.log('🌐 URL:', videoUrl);
    console.log('📏 Size:', size, 'bytes');
    console.log('📝 Alt:', alt);

    res.status(201).json({
      success: true,
      message: 'Vidéo uploadée avec succès',
      data: videoData
    });

  } catch (error) {
    console.error('❌ ===== VIDEO UPLOAD ERROR =====');
    console.error('❌ Error details:', error);

    // Supprimer le fichier si une erreur survient après l'upload
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
        console.log('🗑️ Deleted failed upload video file');
      } catch (deleteError) {
        console.error('❌ Error deleting video file:', deleteError);
      }
    }

    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'upload de la vidéo',
      error: error.message
    });
  }
});

// @route   POST /api/upload/videos
// @desc    Upload multiple videos (up to 3)
// @access  Private (authenticated users only)
router.post('/videos', authenticate, uploadVideo.array('videos', 3), async (req, res) => {
  try {
    console.log('📤 ===== MULTIPLE VIDEOS UPLOAD REQUEST =====');
    console.log('👤 User:', req.user?.email);
    console.log('📁 Files count:', req.files?.length || 0);

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Aucun fichier vidéo reçu'
      });
    }

    const uploadedVideos = [];

    // Traiter chaque fichier
    req.files.forEach((file, index) => {
      const videoUrl = `${req.protocol}://${req.get('host')}/uploads/videos/${file.filename}`;
      const alt = req.body.alt || file.originalname || `Vidéo ${index + 1}`;

      const videoData = {
        url: videoUrl,
        alt: alt,
        type: 'video',
        isUploaded: true,
        uploadedAt: new Date(),
        filename: file.filename,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        path: file.path
      };

      uploadedVideos.push(videoData);
    });

    console.log('✅ ===== MULTIPLE VIDEOS UPLOADED SUCCESSFULLY =====');
    console.log('📊 Count:', uploadedVideos.length);

    res.status(201).json({
      success: true,
      message: `${uploadedVideos.length} vidéo(s) uploadée(s) avec succès`,
      data: uploadedVideos
    });

  } catch (error) {
    console.error('❌ ===== MULTIPLE VIDEOS UPLOAD ERROR =====');
    console.error('❌ Error details:', error);

    // Supprimer les fichiers si une erreur survient
    if (req.files) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          try {
            fs.unlinkSync(file.path);
            console.log('🗑️ Deleted failed upload video file:', file.filename);
          } catch (deleteError) {
            console.error('❌ Error deleting video file:', deleteError);
          }
        }
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'upload des vidéos',
      error: error.message
    });
  }
});

// @route   DELETE /api/upload/video/:filename
// @desc    Delete an uploaded video
// @access  Private (authenticated users only)
router.delete('/video/:filename', authenticate, async (req, res) => {
  try {
    console.log('🗑️ ===== DELETE VIDEO REQUEST =====');
    console.log('👤 User:', req.user?.email);
    console.log('📁 Filename:', req.params.filename);

    const filename = req.params.filename;
    const filePath = path.join(videosDir, filename);

    // Vérifier si le fichier existe
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Fichier vidéo non trouvé'
      });
    }

    // Supprimer le fichier
    fs.unlinkSync(filePath);

    console.log('✅ Video deleted successfully:', filename);

    res.json({
      success: true,
      message: 'Vidéo supprimée avec succès'
    });

  } catch (error) {
    console.error('❌ ===== DELETE VIDEO ERROR =====');
    console.error('❌ Error details:', error);

    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression de la vidéo',
      error: error.message
    });
  }
});

// @route   GET /api/upload/info
// @desc    Get upload system information
// @access  Private (authenticated users only)
router.get('/info', authenticate, async (req, res) => {
  try {
    // Calculer l'espace utilisé pour les images
    let totalImageSize = 0;
    let imageFileCount = 0;

    if (fs.existsSync(imagesDir)) {
      const imageFiles = fs.readdirSync(imagesDir);
      imageFileCount = imageFiles.length;

      imageFiles.forEach(file => {
        const filePath = path.join(imagesDir, file);
        const stats = fs.statSync(filePath);
        totalImageSize += stats.size;
      });
    }

    // Calculer l'espace utilisé pour les vidéos
    let totalVideoSize = 0;
    let videoFileCount = 0;

    if (fs.existsSync(videosDir)) {
      const videoFiles = fs.readdirSync(videosDir);
      videoFileCount = videoFiles.length;

      videoFiles.forEach(file => {
        const filePath = path.join(videosDir, file);
        const stats = fs.statSync(filePath);
        totalVideoSize += stats.size;
      });
    }

    const totalSize = totalImageSize + totalVideoSize;
    const totalFiles = imageFileCount + videoFileCount;

    const uploadInfo = {
      images: {
        maxFileSize: '5MB',
        allowedTypes: ['JPG', 'PNG', 'GIF', 'WEBP'],
        uploadDirectory: imagesDir,
        totalFiles: imageFileCount,
        totalSize: totalImageSize,
        totalSizeFormatted: `${(totalImageSize / (1024 * 1024)).toFixed(2)} MB`,
        serverUrl: `${req.protocol}://${req.get('host')}/uploads/images/`
      },
      videos: {
        maxFileSize: '100MB',
        allowedTypes: ['MP4', 'MOV', 'AVI', 'MKV', 'WEBM'],
        uploadDirectory: videosDir,
        totalFiles: videoFileCount,
        totalSize: totalVideoSize,
        totalSizeFormatted: `${(totalVideoSize / (1024 * 1024)).toFixed(2)} MB`,
        serverUrl: `${req.protocol}://${req.get('host')}/uploads/videos/`
      },
      summary: {
        totalFiles: totalFiles,
        totalSize: totalSize,
        totalSizeFormatted: `${(totalSize / (1024 * 1024)).toFixed(2)} MB`,
        uploadDirectory: uploadDir
      }
    };

    res.json({
      success: true,
      data: uploadInfo
    });

  } catch (error) {
    console.error('❌ Error getting upload info:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des informations',
      error: error.message
    });
  }
});

// ===============================
// ERROR HANDLING MIDDLEWARE
// ===============================

// Gestion des erreurs Multer
router.use((error, req, res, next) => {
  console.error('❌ ===== MULTER ERROR =====');
  console.error('❌ Error details:', error);

  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'Fichier trop volumineux. Maximum: 5MB pour images, 100MB pour vidéos'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Trop de fichiers. Maximum: 5 images ou 3 vidéos'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Champ de fichier inattendu'
      });
    }
  }

  if (error.message.includes('Type de fichier') && error.message.includes('non autorisé')) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  // Erreur générique
  res.status(500).json({
    success: false,
    message: 'Erreur lors de l\'upload',
    error: error.message
  });
});

module.exports = router;