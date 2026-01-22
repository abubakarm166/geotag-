const fs = require('fs');
const path = require('path');

// Configuration
const BUILD_DIR = 'build';
const SOURCE_FILES = [
  'server.js',
  'package.json',
  'package-lock.json'
];
const SOURCE_DIRS = [
  'public'
];

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  red: '\x1b[31m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Clean build directory
function cleanBuildDir() {
  if (fs.existsSync(BUILD_DIR)) {
    log('Cleaning build directory...', 'yellow');
    fs.rmSync(BUILD_DIR, { recursive: true, force: true });
  }
}

// Create build directory structure
function createBuildDir() {
  if (!fs.existsSync(BUILD_DIR)) {
    fs.mkdirSync(BUILD_DIR, { recursive: true });
    log(`Created ${BUILD_DIR} directory`, 'green');
  }
  
  // Create uploads directory in build
  const uploadsDir = path.join(BUILD_DIR, 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
}

// Copy file
function copyFile(src, dest) {
  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  fs.copyFileSync(src, dest);
  log(`  ✓ ${path.relative(process.cwd(), dest)}`, 'green');
}

// Copy directory recursively
function copyDirectory(src, dest) {
  if (!fs.existsSync(src)) {
    log(`  ⚠ Source directory ${src} does not exist`, 'yellow');
    return;
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    // Skip node_modules, .git, uploads, build
    if (['node_modules', '.git', 'uploads', 'build'].includes(entry.name)) {
      continue;
    }
    
    if (entry.isDirectory()) {
      if (!fs.existsSync(destPath)) {
        fs.mkdirSync(destPath, { recursive: true });
      }
      copyDirectory(srcPath, destPath);
    } else {
      // Skip certain files
      if (entry.name.startsWith('.') && entry.name !== '.gitignore') {
        continue;
      }
      copyFile(srcPath, destPath);
    }
  }
}

// Create production package.json
function createProductionPackageJson() {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  // Remove devDependencies for production
  const productionPackage = {
    ...packageJson,
    devDependencies: undefined,
    scripts: {
      start: 'node server.js'
    }
  };
  
  fs.writeFileSync(
    path.join(BUILD_DIR, 'package.json'),
    JSON.stringify(productionPackage, null, 2)
  );
  log('  ✓ package.json (production)', 'green');
}

// Create .gitignore for build
function createBuildGitignore() {
  const gitignoreContent = `node_modules/
uploads/*
!uploads/.gitkeep
*.log
.env
.DS_Store
`;
  fs.writeFileSync(path.join(BUILD_DIR, '.gitignore'), gitignoreContent);
  log('  ✓ .gitignore', 'green');
}

// Create .env.example
function createEnvExample() {
  const envExample = `# Server Configuration
PORT=3000

# Optional: Add other environment variables here
# NODE_ENV=production
# MAX_FILE_SIZE=52428800
`;
  fs.writeFileSync(path.join(BUILD_DIR, '.env.example'), envExample);
  log('  ✓ .env.example', 'green');
}

// Create README for build
function createBuildReadme() {
  const readme = `# GeoTagger - Production Build

This is the production build of GeoTagger.

## Installation

1. Install dependencies:
\`\`\`bash
npm install --production
\`\`\`

2. Set environment variables (optional):
\`\`\`bash
cp .env.example .env
# Edit .env with your configuration
\`\`\`

3. Start the server:
\`\`\`bash
npm start
\`\`\`

## Environment Variables

- \`PORT\`: Server port (default: 3000)
- \`NODE_ENV\`: Environment mode (production/development)

## Deployment

This build is ready for deployment to:
- Heroku
- Railway
- Render
- AWS EC2
- DigitalOcean
- Any Node.js hosting platform
`;
  fs.writeFileSync(path.join(BUILD_DIR, 'README.md'), readme);
  log('  ✓ README.md', 'green');
}

// Main build function
function build() {
  const args = process.argv.slice(2);
  const clean = args.includes('--clean');
  
  log('\n🚀 Starting build process...\n', 'blue');
  
  if (clean) {
    cleanBuildDir();
  }
  
  createBuildDir();
  
  log('\n📦 Copying files...', 'blue');
  
  // Copy source files
  SOURCE_FILES.forEach(file => {
    if (fs.existsSync(file)) {
      copyFile(file, path.join(BUILD_DIR, file));
    }
  });
  
  // Copy source directories
  SOURCE_DIRS.forEach(dir => {
    if (fs.existsSync(dir)) {
      log(`\n📁 Copying ${dir}/...`, 'blue');
      copyDirectory(dir, path.join(BUILD_DIR, dir));
    }
  });
  
  // Create production-specific files
  log('\n📝 Creating production files...', 'blue');
  createProductionPackageJson();
  createBuildGitignore();
  createEnvExample();
  createBuildReadme();
  
  // Create uploads/.gitkeep
  const uploadsGitkeep = path.join(BUILD_DIR, 'uploads', '.gitkeep');
  fs.writeFileSync(uploadsGitkeep, '');
  
  log('\n✅ Build completed successfully!', 'green');
  log(`\n📂 Build directory: ${BUILD_DIR}/`, 'blue');
  log('\n📋 Next steps:', 'yellow');
  log('   1. cd build');
  log('   2. npm install --production');
  log('   3. npm start');
  log('\n');
}

// Run build
build();
