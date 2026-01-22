# 🔴 URGENT FIX: 404 Error on API Routes

## Problem
The `/api/upload` endpoint is returning 404 because the redirects in `netlify.toml` were in the wrong order.

## ✅ Fix Applied
I've reordered the redirects so API routes are checked **BEFORE** the catch-all SPA redirect.

## 🚀 Deploy This Fix NOW

### Step 1: Push to GitHub
```bash
git add .
git commit -m "Fix API route redirects order"
git push origin main
```

### Step 2: Wait for Netlify to Deploy
- Go to Netlify Dashboard
- Wait for the new deployment to complete (1-2 minutes)
- Check that it says "Published"

### Step 3: Test
1. Visit your site: `https://alphageo.netlify.app`
2. Open browser console (F12)
3. Upload an image
4. You should see:
   - ✅ No 404 error
   - ✅ "Upload response:" in console
   - ✅ Tool section appears with map

## What Changed

**Before (WRONG):**
```toml
# Catch-all first (matches everything, including /api/*)
[[redirects]]
  from = "/*"
  to = "/index.html"

# API routes (never reached!)
[[redirects]]
  from = "/api/upload"
  to = "/.netlify/functions/upload"
```

**After (CORRECT):**
```toml
# API routes FIRST (with force = true)
[[redirects]]
  from = "/api/upload"
  to = "/.netlify/functions/upload"
  force = true

# Catch-all LAST (only matches non-API routes)
[[redirects]]
  from = "/*"
  to = "/index.html"
```

## If Still Not Working

1. **Check Netlify Dashboard → Functions**:
   - Should see 4 functions: upload, geotag, download, cleanup
   - If missing, functions weren't deployed

2. **Check Build Logs**:
   - Go to Netlify Dashboard → Deploys
   - Click on latest deploy
   - Check for errors

3. **Verify netlify.toml is in root**:
   - Should be at: `/netlify.toml` (not in public/)
   - Should be committed to Git

4. **Clear browser cache**:
   - Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

## Expected Result

After deploying, when you upload an image:
- ✅ No 404 error
- ✅ API call succeeds
- ✅ Tool section appears
- ✅ Map loads
- ✅ You can set location and geotag
