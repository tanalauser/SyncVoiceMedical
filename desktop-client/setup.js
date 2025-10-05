const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 SyncVoice Medical Desktop Setup');
console.log('=====================================\n');

// Check if we're in the correct directory
const expectedFiles = ['main.js', 'package.json', 'index.html'];
const missingFiles = expectedFiles.filter(file => !fs.existsSync(file));

if (missingFiles.length > 0) {
    console.error('❌ Error: Missing required files:', missingFiles.join(', '));
    console.error('Please ensure you are running this script from the desktop-client directory.');
    process.exit(1);
}

// Create assets directory if it doesn't exist
const assetsDir = path.join(__dirname, 'assets');
if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir);
    console.log('📁 Created assets directory');
}

// Create placeholder icon files
const iconFiles = [
    { name: 'icon.png', description: 'Main application icon (256x256 PNG)' },
    { name: 'icon.ico', description: 'Windows icon (ICO format)' },
    { name: 'icon.icns', description: 'macOS icon (ICNS format)' },
    { name: 'tray-icon.png', description: 'System tray icon (16x16 PNG)' },
    { name: 'tray-icon-recording.png', description: 'Recording state tray icon (16x16 PNG)' }
];

console.log('🖼️  Checking icon files...');
iconFiles.forEach(iconFile => {
    const iconPath = path.join(assetsDir, iconFile.name);
    if (!fs.existsSync(iconPath)) {
        // Create a placeholder file
        fs.writeFileSync(iconPath, '');
        console.log(`⚠️  Created placeholder: ${iconFile.name} - ${iconFile.description}`);
    }
});

// Install dependencies
console.log('\n📦 Installing dependencies...');
try {
    execSync('npm install', { stdio: 'inherit' });
    console.log('✅ Dependencies installed successfully');
} catch (error) {
    console.error('❌ Failed to install dependencies:', error.message);
    process.exit(1);
}

// Try to rebuild robotjs for the current platform
console.log('\n🔧 Rebuilding native modules...');
try {
    execSync('npm run rebuild', { stdio: 'inherit' });
    console.log('✅ Native modules rebuilt successfully');
} catch (error) {
    console.warn('⚠️  Warning: Failed to rebuild native modules. Text insertion might not work properly.');
    console.warn('You may need to install build tools for your platform.');
}

// Create a desktop shortcut script
const createShortcutScript = `
# Create Desktop Shortcut for SyncVoice Medical
$DesktopPath = [Environment]::GetFolderPath("Desktop")
$ShortcutPath = "$DesktopPath\\SyncVoice Medical.lnk"
$WScriptShell = New-Object -ComObject WScript.Shell
$Shortcut = $WScriptShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = "npm"
$Shortcut.Arguments = "start"
$Shortcut.WorkingDirectory = "${__dirname}"
$Shortcut.IconLocation = "${path.join(assetsDir, 'icon.ico')}"
$Shortcut.Description = "SyncVoice Medical Desktop - Medical Dictation Software"
$Shortcut.Save()
Write-Host "Desktop shortcut created successfully!"
`;

fs.writeFileSync('create-shortcut.ps1', createShortcutScript);

// Validation checks
console.log('\n🔍 Running validation checks...');

const validationChecks = [
    {
        name: 'Node.js version',
        check: () => {
            const nodeVersion = process.version;
            const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
            return majorVersion >= 16;
        },
        message: 'Node.js 16+ required'
    },
    {
        name: 'Electron installation',
        check: () => fs.existsSync('node_modules/electron'),
        message: 'Electron should be installed'
    },
    {
        name: 'Main files present',
        check: () => expectedFiles.every(file => fs.existsSync(file)),
        message: 'All main application files should be present'
    }
];

let allChecksPassed = true;
validationChecks.forEach(check => {
    if (check.check()) {
        console.log(`✅ ${check.name}`);
    } else {
        console.log(`❌ ${check.name} - ${check.message}`);
        allChecksPassed = false;
    }
});

// Final instructions
console.log('\n🎉 Setup Complete!');
console.log('==================\n');

if (allChecksPassed) {
    console.log('✅ All validation checks passed!');
    console.log('\n📋 Next Steps:');
    console.log('1. Replace placeholder icon files in the assets/ directory with your actual icons');
    console.log('2. Run "npm start" to launch the application');
    console.log('3. Configure your SyncVoice Medical credentials in the app settings');
    console.log('4. Test the global shortcut: Ctrl+Shift+D');
    
    console.log('\n🔧 Build Instructions:');
    console.log('- Windows: npm run build-win');
    console.log('- macOS: npm run build-mac');
    console.log('- Linux: npm run build-linux');
    
    console.log('\n⚠️  Important Notes:');
    console.log('- Make sure your SyncVoice Medical web server is running');
    console.log('- The app requires microphone permissions');
    console.log('- On first run, you may need to grant accessibility permissions on macOS');
    
} else {
    console.log('⚠️  Some validation checks failed. Please resolve the issues above before proceeding.');
}

console.log('\n📖 For support, visit: https://syncvoicemedical.com/support');
console.log('📧 Email: support@syncvoicemedical.com');