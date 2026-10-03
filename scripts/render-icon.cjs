// Development-only asset renderer. Pass the path to an installed sharp package.
const sharp = require(process.argv[2] || 'sharp');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
async function render() {
  await sharp(path.join(root, 'assets/sketchbook-icon.svg'))
    .png()
    .toFile(path.join(root, 'assets/little-days-icon.png'));
  await sharp(path.join(root, 'assets/sketchbook-icon.svg'))
    .resize(64, 64)
    .png()
    .toFile(path.join(root, 'assets/little-days-favicon.png'));
}
render().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
