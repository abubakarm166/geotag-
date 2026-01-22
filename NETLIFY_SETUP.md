# Netlify Deployment Setup

## ✅ Your app is now configured for Netlify!

The application has been converted to work with Netlify Functions instead of Express server.

## 📋 Deployment Steps

### 1. Push to GitHub
```bash
git add .
git commit -m "Configure for Netlify"
git push origin main
```

### 2. Deploy on Netlify

1. Go to [app.netlify.com](https://app.netlify.com)
2. Click **"Add new site"** → **"Import an existing project"**
3. Connect your **GitHub** account
4. Select your repository
5. Configure build settings:
   - **Publish directory**: `public`
   - **Functions directory**: `netlify/functions`
   - **Build command**: (leave empty)
6. Click **"Deploy site"**

## ⚙️ Configuration

The `netlify.toml` file is already configured with:
- ✅ Function routing (`/api/*` → `/.netlify/functions/*`)
- ✅ CORS headers
- ✅ SPA redirects (all routes → `index.html`)
- ✅ Security headers

## ⚠️ Important Notes

### File Size Limits
- **Netlify Function payload**: 6MB maximum
- **Recommendation**: Keep images under 5MB for best results
- Large files may timeout (10 seconds on free tier)

### How It Works
1. **Frontend** (`public/`) is served as static files
2. **API calls** route to Netlify Functions via `netlify.toml`
3. **Functions** process images in memory (stateless)
4. **Images** are sent as base64 between client and server
5. **Download** happens directly from base64 data

## 🧪 Test Locally

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Run locally
netlify dev
```

Visit `http://localhost:8888` to test.

## 🔧 Troubleshooting

### 404 Error
- Make sure `netlify.toml` exists in root
- Verify `netlify/functions/` directory exists
- Check Netlify build logs

### Functions Not Working
- Check function logs in Netlify Dashboard
- Verify functions are in `netlify/functions/`
- Check CORS headers in `netlify.toml`

### Large File Errors
- Netlify has 6MB payload limit
- Compress images before upload
- Consider alternative hosting for very large files

## 📁 Project Structure

```
geo-tag/
├── netlify.toml           # Netlify configuration
├── netlify/
│   └── functions/         # Serverless functions
│       ├── upload.js
│       ├── geotag.js
│       ├── download.js
│       └── cleanup.js
├── public/                # Frontend (served as static)
│   ├── index.html
│   ├── styles.css
│   └── script.js
└── package.json
```

## 🚀 After Deployment

Your site will be live at: `https://your-site-name.netlify.app`

The application will work exactly the same, but now runs on Netlify's serverless infrastructure!
