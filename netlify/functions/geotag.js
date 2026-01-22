const piexif = require('piexifjs');

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

function getLatRef(lat) {
  return lat >= 0 ? 'N' : 'S';
}

function getLonRef(lon) {
  return lon >= 0 ? 'E' : 'W';
}

exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }
  
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }
  
  try {
    const { filename, lat, lon, description, keywords, imageData } = JSON.parse(event.body);
    
    if (!filename || !imageData) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'Filename and image data are required' })
      };
    }
    
    const imageBuffer = Buffer.from(imageData, 'base64');
    const ext = filename.toLowerCase().split('.').pop();
    
    // Only process JPG files for reliable EXIF support
    if (ext === 'jpg' || ext === 'jpeg') {
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
      
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          success: true,
          downloadFilename: `geotagged_${filename}`,
          imageData: newImageBuffer.toString('base64')
        })
      };
    } else {
      // For non-JPG files, return warning
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          success: true,
          downloadFilename: `geotagged_${filename}`,
          imageData: imageData, // Return original
          warning: 'Geotagging for non-JPG formats may not be fully supported. JPG format is recommended for reliable geotagging.'
        })
      };
    }
  } catch (error) {
    console.error('Geotag error:', error);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: error.message })
    };
  }
};
