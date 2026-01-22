const piexif = require('piexifjs');

// Helper function to parse multipart form data
function parseMultipartFormData(body, boundary) {
  const parts = body.split(`--${boundary}`);
  const result = {};
  
  for (const part of parts) {
    if (!part || part === '--' || part.trim() === '') continue;
    
    const headerEnd = part.indexOf('\r\n\r\n');
    if (headerEnd === -1) continue;
    
    const headers = part.substring(0, headerEnd);
    const content = part.substring(headerEnd + 4, part.length - 2);
    
    // Extract field name
    const nameMatch = headers.match(/name="([^"]+)"/);
    if (nameMatch) {
      const fieldName = nameMatch[1];
      
      // Check if it's a file
      const filenameMatch = headers.match(/filename="([^"]+)"/);
      if (filenameMatch) {
        const contentTypeMatch = headers.match(/Content-Type:\s*([^\r\n]+)/);
        result[fieldName] = {
          filename: filenameMatch[1],
          contentType: contentTypeMatch ? contentTypeMatch[1].trim() : 'application/octet-stream',
          data: Buffer.from(content, 'binary')
        };
      } else {
        result[fieldName] = content.trim();
      }
    }
  }
  
  return result;
}

// Helper function to extract GPS from EXIF
function extractGPS(exifData) {
  if (!exifData.GPS) return null;
  
  const gps = exifData.GPS;
  if (!(piexif.GPSIFD.GPSLatitude in gps) || !(piexif.GPSIFD.GPSLongitude in gps)) {
    return null;
  }
  
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
  
  return {
    lat: latRef === 'S' ? -lat : lat,
    lon: lonRef === 'W' ? -lon : lon
  };
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
    const contentType = event.headers['content-type'] || event.headers['Content-Type'] || '';
    const boundary = contentType.split('boundary=')[1];
    
    if (!boundary) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'No boundary found in Content-Type' })
      };
    }
    
    // Parse multipart form data
    const formData = parseMultipartFormData(event.body, boundary);
    const imageFile = formData.image;
    
    if (!imageFile) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'No image file provided' })
      };
    }
    
    const imageBuffer = imageFile.data;
    let existingGeo = null;
    let existingDescription = null;
    let existingKeywords = null;
    
    // Try to read EXIF data for JPG files
    try {
      const ext = imageFile.filename.toLowerCase().split('.').pop();
      if (ext === 'jpg' || ext === 'jpeg') {
        const exifString = piexif.load(imageBuffer.toString('binary'));
        
        // Extract GPS data
        existingGeo = extractGPS(exifString);
        
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
    
    // Store file data in base64 for retrieval
    const filename = `${Date.now()}-${Math.round(Math.random() * 1E9)}.${imageFile.filename.split('.').pop()}`;
    
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        filename,
        originalName: imageFile.filename,
        existingGeo,
        existingDescription: existingDescription || '',
        existingKeywords: existingKeywords || '',
        // Include base64 data for processing (Netlify Functions are stateless)
        imageData: imageBuffer.toString('base64')
      })
    };
  } catch (error) {
    console.error('Upload error:', error);
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
