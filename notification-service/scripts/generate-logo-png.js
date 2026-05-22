const fs = require('fs');
const path = require('path');

async function main() {
  const sharp = require('sharp');
  const svgPath = path.join(__dirname, '../src/infrastructure/assets/tesla.svg');
  const pngPath = path.join(__dirname, '../src/infrastructure/assets/tesla-logo.png');

  await sharp(svgPath, { density: 300 })
    .resize(240, null, { fit: 'inside' })
    .png()
    .toFile(pngPath);

  console.log(`generated ${pngPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
