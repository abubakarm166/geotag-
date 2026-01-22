// Global variables
let map;
let marker;
let currentFilename = null;
let uploadedImageData = null;

// Initialize map
function initMap() {
    const mapElement = document.getElementById('map');
    if (!mapElement || map) return; // Don't initialize if map doesn't exist or already initialized
    
    map = L.map('map').setView([40.7128, -74.0060], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
    }).addTo(map);

    // Add click handler to map
    map.on('click', function(e) {
        setLocation(e.latlng.lat, e.latlng.lng);
    });
}

// Set location on map
function setLocation(lat, lon) {
    // Update input fields
    const latInput = document.getElementById('latitude');
    const lonInput = document.getElementById('longitude');
    if (latInput) latInput.value = lat.toFixed(6);
    if (lonInput) lonInput.value = lon.toFixed(6);

    // Initialize map if not already done
    if (!map) {
        initMap();
    }

    if (!map) return; // Still no map, exit

    // Remove existing marker
    if (marker) {
        map.removeLayer(marker);
    }

    // Add new marker
    marker = L.marker([lat, lon], { draggable: true }).addTo(map);
    
    // Center map on marker
    map.setView([lat, lon], 13);

    // Update marker position when dragged
    marker.on('dragend', function(e) {
        const position = marker.getLatLng();
        if (latInput) latInput.value = position.lat.toFixed(6);
        if (lonInput) lonInput.value = position.lng.toFixed(6);
    });

    // Enable write button
    const writeBtn = document.getElementById('writeExifBtn');
    if (writeBtn) writeBtn.disabled = false;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    setupFAQ();
    setupSmoothScroll();
});

// Setup event listeners
function setupEventListeners() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const writeExifBtn = document.getElementById('writeExifBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const clearBtn = document.getElementById('clearBtn');
    const setFromCoordsBtn = document.getElementById('setFromCoords');
    const tabButtons = document.querySelectorAll('.tab-btn');

    // File upload
    if (uploadArea) {
        uploadArea.addEventListener('click', () => fileInput.click());
        uploadArea.addEventListener('dragover', handleDragOver);
        uploadArea.addEventListener('dragleave', handleDragLeave);
        uploadArea.addEventListener('drop', handleDrop);
    }
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
    }

    // Set location from coordinates
    if (setFromCoordsBtn) {
        setFromCoordsBtn.addEventListener('click', function() {
            const lat = parseFloat(document.getElementById('latitude').value);
            const lon = parseFloat(document.getElementById('longitude').value);
            
            if (isNaN(lat) || isNaN(lon)) {
                showStatus('Please enter valid latitude and longitude values', 'error');
                return;
            }
            
            if (lat < -90 || lat > 90) {
                showStatus('Latitude must be between -90 and 90', 'error');
                return;
            }
            
            if (lon < -180 || lon > 180) {
                showStatus('Longitude must be between -180 and 180', 'error');
                return;
            }
            
            setLocation(lat, lon);
        });
    }

    // Write EXIF tags
    if (writeExifBtn) {
        writeExifBtn.addEventListener('click', handleWriteExif);
    }

    // Download
    if (downloadBtn) {
        downloadBtn.addEventListener('click', handleDownload);
    }

    // Clear
    if (clearBtn) {
        clearBtn.addEventListener('click', handleClear);
    }

    // Tab switching
    tabButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            switchTab(tabName);
        });
    });
}

// Setup FAQ accordion
function setupFAQ() {
    const faqQuestions = document.querySelectorAll('.faq-question');
    faqQuestions.forEach(question => {
        question.addEventListener('click', function() {
            const faqItem = this.parentElement;
            const isActive = faqItem.classList.contains('active');
            
            // Close all FAQ items
            document.querySelectorAll('.faq-item').forEach(item => {
                item.classList.remove('active');
            });
            
            // Open clicked item if it wasn't active
            if (!isActive) {
                faqItem.classList.add('active');
            }
        });
    });
}

// Setup smooth scroll for navigation links
function setupSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Handle drag over
function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    document.getElementById('uploadArea').classList.add('dragover');
}

// Handle drag leave
function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    document.getElementById('uploadArea').classList.remove('dragover');
}

// Handle drop
function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    const uploadArea = document.getElementById('uploadArea');
    if (uploadArea) {
        uploadArea.classList.remove('dragover');
    }
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]); // Take first file if multiple dropped
    }
}

// Handle file select
function handleFileSelect(e) {
    const file = e.target.files[0]; // Take first file if multiple selected
    if (file) {
        handleFile(file);
    }
}

// Handle file upload
async function handleFile(file) {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/webp'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(jpg|jpeg|png|heic|webp)$/i)) {
        showStatus('Please upload a JPG, PNG, HEIC, or WebP image', 'error');
        return;
    }

    // Show preview in hero section
    const reader = new FileReader();
    reader.onload = function(e) {
        const preview = document.getElementById('imagePreview');
        if (preview) {
            preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
            preview.classList.remove('hidden');
        }
    };
    reader.readAsDataURL(file);

    // Upload to server
    const formData = new FormData();
    formData.append('image', file);

    try {
        showStatus('Uploading image...', 'warning');
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            currentFilename = data.filename;
            uploadedImageData = data;
            
            // Show tool section
            const toolSection = document.getElementById('toolSection');
            if (toolSection) {
                toolSection.classList.remove('hidden');
                // Initialize map if not already initialized
                if (!map) {
                    setTimeout(() => initMap(), 100);
                }
                // Scroll to tool section
                toolSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            
            // Show existing geotags if any
            if (data.existingGeo) {
                const lat = data.existingGeo.lat;
                const lon = data.existingGeo.lon;
                setTimeout(() => setLocation(lat, lon), 200);
                const existingGeoInfo = document.getElementById('existingGeoInfo');
                if (existingGeoInfo) {
                    existingGeoInfo.textContent = 
                        `Existing geotags found: Latitude ${lat.toFixed(6)}, Longitude ${lon.toFixed(6)}`;
                }
            } else {
                const existingGeoInfo = document.getElementById('existingGeoInfo');
                if (existingGeoInfo) {
                    existingGeoInfo.textContent = 
                        'No existing geotags found in this image.';
                }
            }

            // Populate existing description and keywords
            if (data.existingDescription) {
                const descInput = document.getElementById('description');
                if (descInput) descInput.value = data.existingDescription;
            }
            if (data.existingKeywords) {
                const keywordsInput = document.getElementById('keywords');
                if (keywordsInput) keywordsInput.value = data.existingKeywords;
            }

            showStatus('Image uploaded successfully!', 'success');
            const writeBtn = document.getElementById('writeExifBtn');
            if (writeBtn) writeBtn.disabled = false;
        } else {
            showStatus('Upload failed: ' + (data.error || 'Unknown error'), 'error');
        }
    } catch (error) {
        console.error('Upload error:', error);
        showStatus('Error uploading image: ' + error.message, 'error');
    }
}

// Write EXIF tags
async function handleWriteExif() {
    if (!currentFilename) {
        showStatus('Please upload an image first', 'error');
        return;
    }

    const lat = parseFloat(document.getElementById('latitude').value);
    const lon = parseFloat(document.getElementById('longitude').value);
    const description = document.getElementById('description').value;
    const keywords = document.getElementById('keywords').value;

    if (isNaN(lat) || isNaN(lon)) {
        showStatus('Please set a location on the map or enter coordinates', 'error');
        return;
    }

    // Validate description length
    if (description.length > 1300) {
        showStatus('Description must be 1,300 characters or less', 'error');
        return;
    }

    // Validate keywords length
    if (keywords.length > 6600) {
        showStatus('Keywords must be 6,600 characters or less', 'error');
        return;
    }

    try {
        showStatus('Writing EXIF tags...', 'warning');
        const response = await fetch('/api/geotag', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                filename: currentFilename,
                lat: lat,
                lon: lon,
                description: description,
                keywords: keywords
            })
        });

        const data = await response.json();

        if (data.success) {
            showStatus('EXIF tags written successfully! You can now download the image.', 'success');
            document.getElementById('downloadBtn').disabled = false;
            if (data.warning) {
                setTimeout(() => showStatus(data.warning, 'warning'), 2000);
            }
        } else {
            showStatus('Failed to write EXIF tags: ' + (data.error || 'Unknown error'), 'error');
        }
    } catch (error) {
        console.error('Write EXIF error:', error);
        showStatus('Error writing EXIF tags: ' + error.message, 'error');
    }
}

// Download geotagged image
async function handleDownload() {
    if (!currentFilename) {
        showStatus('No image to download', 'error');
        return;
    }

    try {
        const response = await fetch(`/api/download/geotagged_${currentFilename}`);
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `geotagged_${uploadedImageData.originalName || 'image.jpg'}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            showStatus('Download started!', 'success');
        } else {
            showStatus('Download failed. Please write EXIF tags first.', 'error');
        }
    } catch (error) {
        console.error('Download error:', error);
        showStatus('Error downloading image: ' + error.message, 'error');
    }
}

// Clear all data
function handleClear() {
    if (confirm('Are you sure you want to clear all data?')) {
        // Reset form
        const fileInput = document.getElementById('fileInput');
        if (fileInput) fileInput.value = '';
        
        const imagePreview = document.getElementById('imagePreview');
        if (imagePreview) {
            imagePreview.innerHTML = '';
            imagePreview.classList.add('hidden');
        }
        
        const latInput = document.getElementById('latitude');
        if (latInput) latInput.value = '';
        
        const lonInput = document.getElementById('longitude');
        if (lonInput) lonInput.value = '';
        
        const descInput = document.getElementById('description');
        if (descInput) descInput.value = '';
        
        const keywordsInput = document.getElementById('keywords');
        if (keywordsInput) keywordsInput.value = '';
        
        const existingGeoInfo = document.getElementById('existingGeoInfo');
        if (existingGeoInfo) {
            existingGeoInfo.textContent = 'No existing geotags found in this image.';
        }

        // Remove marker
        if (marker && map) {
            map.removeLayer(marker);
            marker = null;
        }

        // Reset map view
        if (map) {
            map.setView([40.7128, -74.0060], 13);
        }

        // Hide tool section
        const toolSection = document.getElementById('toolSection');
        if (toolSection) {
            toolSection.classList.add('hidden');
        }

        // Disable buttons
        const writeBtn = document.getElementById('writeExifBtn');
        if (writeBtn) writeBtn.disabled = true;
        
        const downloadBtn = document.getElementById('downloadBtn');
        if (downloadBtn) downloadBtn.disabled = true;

        // Reset variables
        const oldFilename = currentFilename;
        currentFilename = null;
        uploadedImageData = null;

        // Cleanup server files if needed
        if (oldFilename) {
            fetch(`/api/cleanup/${oldFilename}`, { method: 'DELETE' }).catch(console.error);
            fetch(`/api/cleanup/geotagged_${oldFilename}`, { method: 'DELETE' }).catch(console.error);
        }

        showStatus('Cleared successfully', 'success');
    }
}

// Switch tabs
function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });

    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}Tab`).classList.add('active');
}

// Show status message
function showStatus(message, type = 'success') {
    const statusEl = document.getElementById('statusMessage');
    if (!statusEl) return;
    
    statusEl.textContent = message;
    statusEl.className = `status-message ${type}`;
    statusEl.classList.remove('hidden');

    // Auto-hide after 5 seconds
    setTimeout(() => {
        statusEl.classList.add('hidden');
    }, 5000);
}
