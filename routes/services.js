const express = require('express');
const router = express.Router();
const Service = require('../models/Service'); 
const { authenticate, optionalAuth, authorizeAdmin } = require('../middleware/auth');

// @route   GET /api/services
// @desc    Get all services with filters and pagination
// @access  Public (avec authentification optionnelle)
router.get('/', optionalAuth, async (req, res) => {
  try {
    console.log('📋 GET /api/services - Query params:', req.query);

    const {
      page = 1,
      limit = 12,
      category,
      type,
      minPrice,
      maxPrice,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};

    // Category filter
    if (category) {
      filter.category = category;
    }

    // Type filter
    if (type) {
      filter.type = type;
    }

    // Price range filter
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseFloat(minPrice);
      if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
    }

    // Search filter (name, description, category, type)
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { type: { $regex: search, $options: 'i' } }
      ];
    }

    // Only show active services for non-admin users
    if (!req.user || req.user.role !== 'admin') {
      filter.isActive = true;
    }

    console.log('🔍 Filters applied:', filter);

    // Sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Execute query with pagination
    const [services, totalServices] = await Promise.all([
      Service.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .populate('createdBy', 'firstName lastName email')
        .lean(),
      Service.countDocuments(filter)
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(totalServices / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    const pagination = {
      currentPage: pageNum,
      totalPages,
      totalServices,
      servicesPerPage: limitNum,
      hasNextPage,
      hasPrevPage
    };

    console.log(`✅ Found ${services.length} services (${totalServices} total)`);

    res.json({
      success: true,
      data: {
        services,
        pagination
      }
    });

  } catch (error) {
    console.error('❌ Error fetching services:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching services',
      error: error.message
    });
  }
});

// @route   GET /api/services/:id
// @desc    Get service by ID
// @access  Public (with optional authentication)
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    console.log(`📋 GET /api/services/${req.params.id}`);

    const service = await Service.findById(req.params.id)
      .populate('createdBy', 'firstName lastName email')
      .lean();

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service non trouvé'
      });
    }

    // Check if service is active (unless user is admin)
    if (!service.isActive && (!req.user || req.user.role !== 'admin')) {
      return res.status(404).json({
        success: false,
        message: 'Service not available'
      });
    }

    console.log('✅ Service found:', service.name);

    res.json({
      success: true,
      data: service
    });

  } catch (error) {
    console.error('❌ Error fetching service:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'ID de service invalide'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error fetching service',
      error: error.message
    });
  }
});

// @route   POST /api/services
// @desc    Create a new service
// @access  Admin only
router.post('/', authenticate, authorizeAdmin, async (req, res) => {
  try {
    console.log('📝 ===== POST /api/services - CREATING NEW SERVICE =====');
    console.log('📊 Request body received:', req.body);

    const {
      name,
      description,
      price,
      duration,
      category,
      type,
      maxParticipants = 10,
      isActive = true,
      images = [],
      videos = [],
      equipment = [],
      tags = [],
      deliverables = {
        photos: { digitalCount: 0, printCount: 0 },
        videos: { duration: 0 },
        deliveryTime: 7
      },
      location = { type: 'studio' }
    } = req.body;

    // Basic validation
    if (!name || !description || !price || !duration || !category || !type) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be filled'
      });
    }

    // ✅ VALIDATION AMÉLIORÉE AVEC VÉRIFICATION NaN
    const parsedPrice = parseFloat(price);
    const parsedDuration = parseInt(duration);
    const parsedMaxParticipants = parseInt(maxParticipants);

    if (isNaN(parsedPrice) || parsedPrice < 0) {
      return res.status(400).json({
        success: false,
        message: 'Le prix doit être un nombre positif'
      });
    }

    if (isNaN(parsedDuration) || parsedDuration < 0) {
      return res.status(400).json({
        success: false,
        message: 'La durée doit être un nombre positif'
      });
    }

    if (isNaN(parsedMaxParticipants) || parsedMaxParticipants < 1) {
      return res.status(400).json({
        success: false,
        message: 'Le nombre maximum de participants doit être supérieur à 0'
      });
    }

    // ✅ DETAILED DEBUG FOR IMAGES
    console.log('🖼️ ===== IMAGE PROCESSING DEBUG =====');
    console.log('📸 Raw images received:', images);
    console.log('📊 Images count received:', images ? images.length : 0);

    // ✅ VALIDATE AND CLEAN IMAGES
    const processedImages = [];
    if (images && Array.isArray(images)) {
      images.forEach((image, index) => {
        console.log(`🔍 Processing image ${index + 1}:`, image);
        
        if (image && image.url) {
          const cleanImage = {
            url: image.url,
            alt: image.alt || `Image ${index + 1}`,
            type: 'image', // ✅ ENSURE TYPE IS ALWAYS 'image'
            isUploaded: image.isUploaded || false,
            uploadedAt: image.uploadedAt || new Date()
          };
          
          // Add optional fields if they exist
          if (image.filename) cleanImage.filename = image.filename;
          if (image.originalname) cleanImage.originalname = image.originalname;
          if (image.mimetype) cleanImage.mimetype = image.mimetype;
          if (image.size) cleanImage.size = image.size;
          
          processedImages.push(cleanImage);
          console.log(`✅ Processed image ${index + 1}:`, cleanImage);
        } else {
          console.log(`❌ Invalid image ${index + 1} - missing URL:`, image);
        }
      });
    }

    console.log('🎯 Final processed images:', processedImages);
    console.log('📈 Final images count:', processedImages.length);

    // ✅ PROCESS VIDEOS SIMILARLY
    const processedVideos = [];
    if (videos && Array.isArray(videos)) {
      videos.forEach((video, index) => {
        if (video && video.url) {
          processedVideos.push({
            url: video.url,
            alt: video.alt || `Video ${index + 1}`,
            type: 'video',
            isUploaded: video.isUploaded || false,
            uploadedAt: video.uploadedAt || new Date()
          });
        }
      });
    }

    console.log('🔧 Equipment to save:', equipment);
    console.log('🏷️ Tags to save:', tags);

    // ✅ CREATE THE SERVICE WITH ALL PROCESSED DATA
    const service = new Service({
      name,
      description,
      price: parsedPrice,
      duration: parsedDuration,
      category,
      type,
      maxParticipants: parsedMaxParticipants,
      isActive,
     
      // ✅ PERFECTLY PROCESSED MEDIA
      images: processedImages,
      videos: processedVideos,
      equipment: equipment || [],
      tags: tags || [],
      deliverables: deliverables || {
        photos: { digitalCount: 0, printCount: 0 },
        videos: { duration: 0 },
        deliveryTime: 7
      },
      location: location || { type: 'studio' },
      createdBy: req.user._id
    });

    console.log('💾 ===== SAVING SERVICE TO DATABASE =====');
    console.log('📊 Service object before save:', {
      name: service.name,
      imagesCount: service.images.length,
      videosCount: service.videos.length,
      equipmentCount: service.equipment.length,
      tagsCount: service.tags.length
    });

    const savedService = await service.save();
    await savedService.populate('createdBy', 'firstName lastName email');

    console.log('🎉 ===== SERVICE SAVED SUCCESSFULLY =====');
    console.log('✅ Saved service ID:', savedService._id);
    console.log('📸 Images saved count:', savedService.images.length);
    console.log('🎬 Videos saved count:', savedService.videos.length);
    console.log('🔧 Equipment saved count:', savedService.equipment.length);
    console.log('🏷️ Tags saved count:', savedService.tags.length);

    // ✅ LOG EACH SAVED IMAGE FOR VERIFICATION
    if (savedService.images && savedService.images.length > 0) {
      console.log('📸 ===== SAVED IMAGES DETAILS =====');
      savedService.images.forEach((img, index) => {
        console.log(`📸 Image ${index + 1}:`, {
          id: img._id,
          url: img.url,
          alt: img.alt,
          type: img.type,
          isUploaded: img.isUploaded
        });
      });
    }

    res.status(201).json({
      success: true,
      message: 'Service créé avec succès',
      data: savedService
    });

  } catch (error) {
    console.error('❌ ===== ERROR CREATING SERVICE =====');
    console.error('❌ Error details:', error);

    if (error.name === 'ValidationError') {
      console.error('❌ Validation errors:', error.errors);
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        error: error.message,
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erreur lors de la création du service',
      error: error.message
    });
  }
});

// @route   PUT /api/services/:id
// @desc    Update a service
// @access  Admin only
router.put('/:id', authenticate, authorizeAdmin, async (req, res) => {
  try {
    console.log(`📝 ===== PUT /api/services/${req.params.id} - UPDATING SERVICE =====`);
    console.log('📊 Request body received:', req.body);

    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service non trouvé'
      });
    }

    const {
      name,
      description,
      price,
      duration,
      category,
      type,
      maxParticipants,
      isActive,
      images,
      videos,
      equipment,
      tags,
      deliverables,
      location
    } = req.body;

    // Update fields with proper validation
    if (name !== undefined) service.name = name;
    if (description !== undefined) service.description = description;
    
    // ✅ VALIDATION DES NOMBRES AVEC VÉRIFICATION NaN
    if (price !== undefined) {
      const parsedPrice = parseFloat(price);
      if (isNaN(parsedPrice) || parsedPrice < 0) {
        return res.status(400).json({
          success: false,
          message: 'Le prix doit être un nombre positif'
        });
      }
      service.price = parsedPrice;
    }
    
    if (duration !== undefined) {
      const parsedDuration = parseInt(duration);
      if (isNaN(parsedDuration) || parsedDuration < 0) {
        return res.status(400).json({
          success: false,
          message: 'La durée doit être un nombre positif'
        });
      }
      service.duration = parsedDuration;
    }
    
    if (maxParticipants !== undefined) {
      const parsedMax = parseInt(maxParticipants);
      if (isNaN(parsedMax) || parsedMax < 1) {
        return res.status(400).json({
          success: false,
          message: 'Le nombre maximum de participants doit être supérieur à 0'
        });
      }
      service.maxParticipants = parsedMax;
    }

    if (category !== undefined) service.category = category;
    if (type !== undefined) service.type = type;
    if (isActive !== undefined) service.isActive = isActive;

    // ✅ TRAITEMENT COMPLET DES IMAGES (même logique que POST)
    if (images !== undefined) {
      console.log('🖼️ ===== UPDATING IMAGES DEBUG =====');
      console.log('📸 Raw images received for update:', images);
      console.log('📊 Images count received:', images ? images.length : 0);
      
      const processedImages = [];
      if (images && Array.isArray(images)) {
        images.forEach((image, index) => {
          console.log(`🔍 Processing update image ${index + 1}:`, image);
          
          if (image && image.url) {
            const cleanImage = {
              url: image.url,
              alt: image.alt || `Image ${index + 1}`,
              type: 'image',
              isUploaded: image.isUploaded || false,
              uploadedAt: image.uploadedAt || new Date()
            };
            
            // Add optional fields if they exist
            if (image.filename) cleanImage.filename = image.filename;
            if (image.originalname) cleanImage.originalname = image.originalname;
            if (image.mimetype) cleanImage.mimetype = image.mimetype;
            if (image.size) cleanImage.size = image.size;
            
            processedImages.push(cleanImage);
            console.log(`✅ Processed update image ${index + 1}:`, cleanImage);
          } else {
            console.log(`❌ Invalid update image ${index + 1} - missing URL:`, image);
          }
        });
      }
      
      service.images = processedImages;
      console.log('🎯 Final processed images for update:', processedImages);
      console.log('📈 Final images count for update:', processedImages.length);
    }
    
    // ✅ TRAITEMENT COMPLET DES VIDÉOS (même logique que POST)
    if (videos !== undefined) {
      console.log('🎬 ===== UPDATING VIDEOS DEBUG =====');
      console.log('🎥 Raw videos received for update:', videos);
      
      const processedVideos = [];
      if (videos && Array.isArray(videos)) {
        videos.forEach((video, index) => {
          console.log(`🔍 Processing update video ${index + 1}:`, video);
          
          if (video && video.url) {
            const cleanVideo = {
              url: video.url,
              alt: video.alt || `Video ${index + 1}`,
              type: 'video',
              isUploaded: video.isUploaded || false,
              uploadedAt: video.uploadedAt || new Date()
            };
            
            // Add optional fields if they exist
            if (video.filename) cleanVideo.filename = video.filename;
            if (video.originalname) cleanVideo.originalname = video.originalname;
            if (video.mimetype) cleanVideo.mimetype = video.mimetype;
            if (video.size) cleanVideo.size = video.size;
            
            processedVideos.push(cleanVideo);
            console.log(`✅ Processed update video ${index + 1}:`, cleanVideo);
          } else {
            console.log(`❌ Invalid update video ${index + 1} - missing URL:`, video);
          }
        });
      }
      
      service.videos = processedVideos;
      console.log('🎯 Final processed videos for update:', processedVideos);
    }
    
    // ✅ UPDATE OTHER FIELDS WITH VALIDATION
    if (equipment !== undefined) {
      service.equipment = Array.isArray(equipment) ? equipment : [];
      console.log('🔧 Updated equipment:', service.equipment);
    }
    
    if (tags !== undefined) {
      service.tags = Array.isArray(tags) ? tags : [];
      console.log('🏷️ Updated tags:', service.tags);
    }
    
    if (deliverables !== undefined) {
      service.deliverables = deliverables;
      console.log('📦 Updated deliverables:', service.deliverables);
    }
    
    if (location !== undefined) {
      service.location = location;
      console.log('📍 Updated location:', service.location);
    }

    service.updatedAt = new Date();

    console.log('💾 ===== SAVING UPDATED SERVICE TO DATABASE =====');
    const updatedService = await service.save();
    await updatedService.populate('createdBy', 'firstName lastName email');

    console.log('✅ ===== SERVICE UPDATED SUCCESSFULLY =====');
    console.log('✅ Updated service details:', {
      id: updatedService._id,
      name: updatedService.name,
      imagesCount: updatedService.images?.length || 0,
      videosCount: updatedService.videos?.length || 0,
      equipmentCount: updatedService.equipment?.length || 0,
      tagsCount: updatedService.tags?.length || 0
    });

    res.json({
      success: true,
      message: 'Service mis à jour avec succès',
      data: updatedService
    });

  } catch (error) {
    console.error('❌ ===== ERROR UPDATING SERVICE =====');
    console.error('❌ Error details:', error);

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'ID de service invalide'
      });
    }

    if (error.name === 'ValidationError') {
      console.error('❌ Validation errors:', error.errors);
      return res.status(400).json({
        success: false,
        message: 'Données invalides',
        error: error.message,
        details: error.errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du service',
      error: error.message
    });
  }
});

// @route   DELETE /api/services/:id
// @desc    Delete a service
// @access  Admin only
router.delete('/:id', authenticate, authorizeAdmin, async (req, res) => {
  try {
    console.log(`🗑️ DELETE /api/services/${req.params.id} - Deleting service`);

    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service non trouvé'
      });
    }

    await Service.findByIdAndDelete(req.params.id);

    console.log('✅ Service deleted successfully:', service.name);

    res.json({
      success: true,
      message: 'Service supprimé avec succès'
    });

  } catch (error) {
    console.error('❌ Error deleting service:', error);

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'ID de service invalide'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erreur lors de la suppression du service',
      error: error.message
    });
  }
});

// @route   POST /api/services/:id/toggle-status
// @desc    Toggle service active status
// @access  Admin only
router.post('/:id/toggle-status', authenticate, authorizeAdmin, async (req, res) => {
  try {
    console.log(`🔄 POST /api/services/${req.params.id}/toggle-status`);

    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service non trouvé'
      });
    }

    service.isActive = !service.isActive;
    service.updatedAt = new Date();

    const updatedService = await service.save();
    await updatedService.populate('createdBy', 'firstName lastName email');

    console.log(`✅ Service status toggled: ${updatedService.name} -> ${updatedService.isActive ? 'Active' : 'Inactive'}`);

    res.json({
      success: true,
      message: `Service ${updatedService.isActive ? 'activé' : 'désactivé'} avec succès`,
      data: updatedService
    });

  } catch (error) {
    console.error('❌ Error toggling service status:', error);

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'ID de service invalide'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erreur lors du changement de statut',
      error: error.message
    });
  }
});

module.exports = router;