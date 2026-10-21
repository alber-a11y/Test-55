// Builds two archives in release/: the game for upload (contents of dist/) and the full sources.
// Usage: npm run build && npm run zip
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync } from 'node:fs';

if (!existsSync('dist/index.html')) {
  console.error('dist/ is missing — run `npm run build` first');
  process.exit(1);
}
mkdirSync('release', { recursive: true });
for (const f of ['release/block-rush-game.zip', 'release/block-rush-source.zip']) rmSync(f, { force: true });
// Platforms want index.html at the archive root, so zip the folder contents.
execSync('cd dist && zip -qr ../release/block-rush-game.zip .', { stdio: 'inherit' });
execSync(
  'zip -qr release/block-rush-source.zip . -x "node_modules/*" "dist/*" "release/*" "shots/*" "*.DS_Store"',
  { stdio: 'inherit' },
);
console.log('release/block-rush-game.zip   — upload to the platform');
console.log('release/block-rush-source.zip — full sources');
