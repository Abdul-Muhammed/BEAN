const fs = require('fs');
const path = require('path');

console.log('Running EAS build pre-install script...');
console.log('Current working directory:', process.cwd());

// Create .expo/web directory with proper permissions before prebuild
const directories = [
  path.join(process.cwd(), '.expo'),
  path.join(process.cwd(), '.expo', 'web'),
  path.join(process.cwd(), '.expo', 'web', 'cache'),
  '/tmp/cache',
  '/tmp/expo-cache'
];

directories.forEach(dir => {
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true, mode: 0o777 });
      console.log(`Created directory: ${dir}`);
    } else {
      // Try to make it writable
      try {
        fs.chmodSync(dir, 0o777);
        console.log(`Set permissions on: ${dir}`);
      } catch (e) {
        console.log(`Could not chmod ${dir}: ${e.message}`);
      }
    }
  } catch (error) {
    console.log(`Note: Could not create ${dir}: ${error.message}`);
  }
});

console.log('Pre-install script completed.');
