const mongoose = require('mongoose');

// ✅ SCHÉMA POUR LES MÉDIAS (IMAGES ET VIDÉOS)
const mediaSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true
  },
  alt: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    enum: ['image', 'video'],
    required: true
  },
  isUploaded: {
    type: Boolean,
    default: false // false = URL externe, true = fichier uploadé
  },
  filename: {
    type: String // Nom du fichier pour les uploads
  },
  originalname: {
    type: String // Nom original du fichier
  },
  mimetype: {
    type: String // Type MIME du fichier
  },
  size: {
    type: Number // Taille en bytes
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

// ✅ SCHÉMA PRINCIPAL DU SERVICE AVEC NOUVEAUX CHAMPS
const serviceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Le nom du service est requis'],
    trim: true,
    maxlength: [100, 'Le nom ne peut pas dépasser 100 caractères']
  },
  
  description: {
    type: String,
    required: [true, 'La description est requise'],
    maxlength: [1000, 'La description ne peut pas dépasser 1000 caractères']
  },
  
  price: {
    type: Number,
    required: [true, 'Le prix est requis'],
    min: [0, 'Le prix doit être positif']
  },
  
  duration: {
    type: Number, // Duration in minutes
    required: [true, 'La durée est requise'],
    min: [15, 'La durée minimum est de 15 minutes']
  },
  
  category: {
    type: String,
    required: [true, 'La catégorie est requise'],
    enum: {
      values: ['photo', 'video', 'photo-video'],
      message: 'Catégorie invalide'
    }
  },
  
  type: {
    type: String,
    required: [true, 'Le type est requis'],
    enum: {
      values: [
        'portrait', 'mariage', 'evenement', 'entreprise', 'produit', 
        'famille', 'mode', 'sport', 'immobilier', 'nature', 
        'nouveau-ne', 'grossesse', 'bapteme', 'anniversaire', 'autre'
      ],
      message: 'Type de service invalide'
    }
  },
  
  maxParticipants: {
    type: Number,
    default: 10,
    min: [1, 'Au moins 1 participant requis'],
    max: [50, 'Maximum 50 participants autorisés']
  },

  // ✅ NOUVEAUX CHAMPS POUR LES MÉDIAS
  images: [mediaSchema],
  videos: [mediaSchema],

  // ✅ ÉQUIPEMENTS INCLUS
  equipment: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: ''
    }
  }],

  // ✅ TAGS POUR RECHERCHE ET FILTRAGE
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],

  // ✅ LIVRABLES INCLUS DANS LE SERVICE
  deliverables: {
    photos: {
      digitalCount: {
        type: Number,
        default: 0,
        min: 0
      },
      printCount: {
        type: Number,
        default: 0,
        min: 0
      }
    },
    videos: {
      duration: {
        type: Number, // Durée en minutes
        default: 0,
        min: 0
      }
    },
    deliveryTime: {
      type: Number, // Délai en jours
      default: 7,
      min: 1
    }
  },

  // ✅ INFORMATIONS SUR LE LIEU
  location: {
    type: {
      type: String,
      enum: ['studio', 'client-home', 'outdoor', 'event-venue', 'other'],
      default: 'studio'
    }
  },

  isActive: {
    type: Boolean,
    default: true
  },
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true // Ajoute automatiquement createdAt et updatedAt
});

// ✅ INDEX POUR PERFORMANCES
serviceSchema.index({ category: 1, type: 1 });
serviceSchema.index({ price: 1 });
serviceSchema.index({ isActive: 1 });
serviceSchema.index({ createdAt: -1 });

// ✅ INDEX DE RECHERCHE TEXTUELLE
serviceSchema.index({
  name: 'text',
  description: 'text',
  tags: 'text'
});

module.exports = mongoose.model('Service', serviceSchema);