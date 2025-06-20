const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    console.log('🔗 Tentative de connexion à MongoDB...');
    console.log('URI utilisée:', process.env.MONGO_URI?.replace(/:[^:@]*@/, ':***@'));
    
    // Connexion à MongoDB (sans options dépréciées)
    const conn = await mongoose.connect(process.env.MONGO_URI);

    console.log(`✅ MongoDB connecté: ${conn.connection.host}`);
    console.log(`📊 Base de données: ${conn.connection.name}`);
    
    // Gestion des événements de connexion
    mongoose.connection.on('connected', () => {
      console.log('🔗 Mongoose connecté à MongoDB');
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ Erreur de connexion MongoDB:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('🔌 Mongoose déconnecté de MongoDB');
    });

    // Fermeture propre de la connexion
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('🛑 Connexion MongoDB fermée');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Erreur de connexion à la base de données:', error.message);
    console.error('🔧 Vérifiez vos identifiants MongoDB Atlas');
    process.exit(1);
  }
};

module.exports = connectDB;