const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: 'dndhxtiqt',      // from your .env or Railway variables
  api_key: '286425582592226',
  api_secret: '3RUz8D_r2KCPeHEXaHEWdrxZC0A',
});

module.exports = cloudinary;





