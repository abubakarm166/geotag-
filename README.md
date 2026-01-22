# Geo Tag Tool

A web application for geotagging images with geographical location data (latitude/longitude) and additional EXIF metadata like keywords and descriptions.

## Features

- 📸 **Upload Images**: Support for JPG, PNG, HEIC, and WebP formats
- 🗺️ **Interactive Map**: Click on the map or enter coordinates manually to set location
- 📍 **Read Existing Geotags**: Automatically detects and displays existing geotags in uploaded images
- ✏️ **Add Metadata**: Add keywords and descriptions to improve image searchability
- 💾 **Download Geotagged Images**: Download images with embedded EXIF data
- 🎨 **Modern UI**: Beautiful, responsive design with intuitive user interface

## Prerequisites

- Node.js (v14 or higher)
- npm (Node Package Manager)

## Installation

1. Clone or download this repository

2. Install dependencies:
```bash
npm install
```

## Usage

1. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

2. Open your browser and navigate to:
```
http://localhost:3000
```

3. Use the application:
   - Upload an image by clicking the upload area or dragging and dropping
   - Set the location by clicking on the map or entering coordinates manually
   - Optionally add keywords and description
   - Click "Write EXIF Tags" to embed the geotag data
   - Click "Download" to save the geotagged image

## How It Works

1. **Upload**: Images are uploaded to the server and existing EXIF data is read
2. **Location Setting**: You can set the location using an interactive map (OpenStreetMap) or by entering coordinates
3. **EXIF Writing**: The application writes GPS coordinates, keywords, and descriptions to the image's EXIF metadata
4. **Download**: Download the processed image with embedded geotags

## Supported Formats

- **JPG/JPEG**: Full EXIF support (recommended for reliable geotagging)
- **PNG**: Limited EXIF support
- **HEIC**: Limited EXIF support
- **WebP**: Limited EXIF support

**Note**: JPG format is recommended for the most reliable geotagging experience, as it has standardized EXIF metadata support.

## Technical Details

### Backend
- **Express.js**: Web server framework
- **Multer**: File upload handling
- **Piexifjs**: EXIF data manipulation for JPG images
- **Sharp**: Image processing library

### Frontend
- **Leaflet**: Interactive map library
- **OpenStreetMap**: Map tiles
- **Vanilla JavaScript**: No framework dependencies

## API Endpoints

- `POST /api/upload`: Upload an image and read existing EXIF data
- `POST /api/geotag`: Write geotags and metadata to an image
- `GET /api/download/:filename`: Download a processed image
- `DELETE /api/cleanup/:filename`: Delete uploaded files

## File Structure

```
geo-tag-tool/
├── server.js          # Express server and API endpoints
├── package.json       # Dependencies and scripts
├── public/            # Frontend files
│   ├── index.html     # Main HTML page
│   ├── styles.css     # Styling
│   └── script.js      # Frontend JavaScript
├── uploads/           # Uploaded images (created automatically)
└── README.md          # This file
```

## Limitations

- Free tier: No rate limiting implemented (can be added for production)
- File size limit: 50MB per upload
- PNG/WebP/HEIC geotagging may not be fully supported by all metadata viewers
- Uploaded files are stored locally and should be cleaned up periodically

## Security Notes

- This is a development tool. For production use, consider:
  - Adding authentication
  - Implementing rate limiting
  - Adding file size restrictions
  - Setting up proper file cleanup mechanisms
  - Using environment variables for configuration

## License

MIT

## Support

For issues or questions, please check the code comments or create an issue in the repository.
