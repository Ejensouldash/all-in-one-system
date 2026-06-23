const fs = require('fs');
const path = require('path');

const srcDir = `C:\\Users\\user\\.gemini\\antigravity\\brain\\81e1b353-c1fc-4fa7-b5e1-9b0c472c6ea7`;
const destDir = path.join(__dirname, 'public', 'avatars');

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

const files = [
  { src: 'aria_idle_1781754812985.png', dest: 'aria_idle.png' },
  { src: 'aria_thinking_1781754834199.png', dest: 'aria_thinking.png' },
  { src: 'aria_excited_1781754843946.png', dest: 'aria_excited.png' }
];

files.forEach(file => {
  const srcPath = path.join(srcDir, file.src);
  const destPath = path.join(destDir, file.dest);
  try {
    fs.copyFileSync(srcPath, destPath);
    console.log(`Copied ${file.src} to ${file.dest}`);
  } catch (err) {
    console.error(`Error copying ${file.src}:`, err);
  }
});
