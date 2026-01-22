const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const piexif = require('piexifjs');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|heic|webp/i;
    const extname = allowedTypes.test(path.extname(file.originalname));
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG, HEIC, and WebP images are allowed!'));
    }
  }
});

// Helper function to convert decimal degrees to EXIF format
function decimalToDMS(decimal) {
  const degrees = Math.floor(Math.abs(decimal));
  const minutesFloat = (Math.abs(decimal) - degrees) * 60;
  const minutes = Math.floor(minutesFloat);
  const seconds = (minutesFloat - minutes) * 60;
  
  return [
    [degrees, 1],
    [minutes, 1],
    [Math.round(seconds * 10000), 10000]
  ];
}

// Helper function to get EXIF reference (N/S, E/W)
function getLatRef(lat) {
  return lat >= 0 ? 'N' : 'S';
}

function getLonRef(lon) {
  return lon >= 0 ? 'E' : 'W';
}

// Route to handle image upload and read existing EXIF
app.post('/api/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const filePath = req.file.path;
    const imageBuffer = fs.readFileSync(filePath);
    
    let exifData = null;
    let existingGeo = null;
    let existingDescription = null;
    let existingKeywords = null;

    // Try to read EXIF data
    try {
      if (req.file.mimetype === 'image/jpeg' || path.extname(req.file.originalname).toLowerCase() === '.jpg' || path.extname(req.file.originalname).toLowerCase() === '.jpeg') {
        const exifString = piexif.load(imageBuffer.toString('binary'));
        exifData = exifString;

        // Extract GPS data
        if (exifString.GPS) {
          const gps = exifString.GPS;
          if (piexif.GPSIFD.GPSLatitude in gps && piexif.GPSIFD.GPSLongitude in gps) {
            const latArray = gps[piexif.GPSIFD.GPSLatitude];
            const lonArray = gps[piexif.GPSIFD.GPSLongitude];
            const latRef = gps[piexif.GPSIFD.GPSLatitudeRef] || 'N';
            const lonRef = gps[piexif.GPSIFD.GPSLongitudeRef] || 'E';

            const lat = (latArray[0][0] / latArray[0][1]) +
                       (latArray[1][0] / latArray[1][1] / 60) +
                       (latArray[2][0] / latArray[2][1] / 3600);
            const lon = (lonArray[0][0] / lonArray[0][1]) +
                       (lonArray[1][0] / lonArray[1][1] / 60) +
                       (lonArray[2][0] / lonArray[2][1] / 3600);

            existingGeo = {
              lat: latRef === 'S' ? -lat : lat,
              lon: lonRef === 'W' ? -lon : lon
            };
          }
        }

        // Extract description
        if (exifString['0th'] && piexif.ImageIFD.ImageDescription in exifString['0th']) {
          existingDescription = exifString['0th'][piexif.ImageIFD.ImageDescription];
        }

        // Extract keywords
        if (exifString['0th'] && piexif.ImageIFD.XPKeywords in exifString['0th']) {
          existingKeywords = exifString['0th'][piexif.ImageIFD.XPKeywords];
        }
      }
    } catch (exifError) {
      console.log('Could not read EXIF data:', exifError.message);
    }

    res.json({
      success: true,
      filename: req.file.filename,
      originalName: req.file.originalname,
      existingGeo,
      existingDescription: existingDescription || '',
      existingKeywords: existingKeywords || ''
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Route to write geotags and EXIF data to image
app.post('/api/geotag', async (req, res) => {
  try {
    const { filename, lat, lon, description, keywords } = req.body;

    if (!filename) {
      return res.status(400).json({ error: 'Filename is required' });
    }

    const filePath = path.join('uploads', filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    const imageBuffer = fs.readFileSync(filePath);
    const ext = path.extname(filename).toLowerCase();

    // Only process JPG files for now (most reliable EXIF support)
    if (ext === '.jpg' || ext === '.jpeg') {
      let exifObj = {};
      
      try {
        exifObj = piexif.load(imageBuffer.toString('binary'));
      } catch (e) {
        exifObj = { '0th': {}, 'Exif': {}, 'GPS': {}, '1st': {}, 'thumbnail': null };
      }

      // Add GPS data if provided
      if (lat !== undefined && lat !== null && lon !== undefined && lon !== null) {
        const latDMS = decimalToDMS(Math.abs(lat));
        const lonDMS = decimalToDMS(Math.abs(lon));

        exifObj.GPS[piexif.GPSIFD.GPSLatitude] = latDMS;
        exifObj.GPS[piexif.GPSIFD.GPSLatitudeRef] = getLatRef(lat);
        exifObj.GPS[piexif.GPSIFD.GPSLongitude] = lonDMS;
        exifObj.GPS[piexif.GPSIFD.GPSLongitudeRef] = getLonRef(lon);
      }

      // Add description
      if (description) {
        exifObj['0th'][piexif.ImageIFD.ImageDescription] = description;
      }

      // Add keywords
      if (keywords) {
        exifObj['0th'][piexif.ImageIFD.XPKeywords] = keywords;
      }

      const exifBytes = piexif.dump(exifObj);
      const newImageData = piexif.insert(exifBytes, imageBuffer.toString('binary'));
      const newImageBuffer = Buffer.from(newImageData, 'binary');

      // Save the geotagged image
      const outputPath = path.join('uploads', 'geotagged_' + filename);
      fs.writeFileSync(outputPath, newImageBuffer);

      res.json({
        success: true,
        downloadFilename: 'geotagged_' + filename
      });
    } else {
      // For non-JPG files, we'll use sharp to preserve the image and add metadata
      // Note: Sharp has limited EXIF writing support, so this is a simplified approach
      let sharpImage = sharp(imageBuffer);
      
      // For PNG/WebP, we can't reliably write GPS EXIF, but we'll try to preserve the image
      const outputPath = path.join('uploads', 'geotagged_' + filename);
      await sharpImage.toFile(outputPath);

      res.json({
        success: true,
        downloadFilename: 'geotagged_' + filename,
        warning: 'Geotagging for non-JPG formats may not be fully supported. JPG format is recommended for reliable geotagging.'
      });
    }
  } catch (error) {
    console.error('Geotag error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Route to download geotagged image
app.get('/api/download/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join('uploads', filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    res.download(filePath, (err) => {
      if (err) {
        console.error('Download error:', err);
        res.status(500).json({ error: 'Error downloading file' });
      }
    });
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Cleanup route to delete uploaded files
app.delete('/api/cleanup/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join('uploads', filename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
