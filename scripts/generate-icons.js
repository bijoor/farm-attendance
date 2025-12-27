import sharp from 'sharp';
import { readFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(__dirname, '../public/icons');

// Ensure icons directory exists
if (!existsSync(iconsDir)) {
  mkdirSync(iconsDir, { recursive: true });
}

const sizes = [192, 512];

async function generateIcons() {
  for (const size of sizes) {
    const svgPath = join(iconsDir, `icon-${size}.svg`);
    const pngPath = join(iconsDir, `icon-${size}.png`);

    try {
      const svgBuffer = readFileSync(svgPath);
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(pngPath);
      console.log(`Generated: icon-${size}.png`);
    } catch (error) {
      console.error(`Error generating icon-${size}.png:`, error.message);
    }
  }

  // Also generate apple-touch-icon (180x180)
  try {
    const svg512 = readFileSync(join(iconsDir, 'icon-512.svg'));
    await sharp(svg512)
      .resize(180, 180)
      .png()
      .toFile(join(iconsDir, 'apple-touch-icon.png'));
    console.log('Generated: apple-touch-icon.png');
  } catch (error) {
    console.error('Error generating apple-touch-icon.png:', error.message);
  }

  // Generate favicon (32x32)
  try {
    const svg192 = readFileSync(join(iconsDir, 'icon-192.svg'));
    await sharp(svg192)
      .resize(32, 32)
      .png()
      .toFile(join(__dirname, '../public/favicon.png'));
    console.log('Generated: favicon.png');
  } catch (error) {
    console.error('Error generating favicon.png:', error.message);
  }
}

generateIcons().then(() => {
  console.log('Icon generation complete!');
}).catch(console.error);
