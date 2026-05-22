import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

export const EMAIL_LOGO_CID = 'tesla-logo@supercharger';

export function getEmailLogoBuffer(): Buffer {
  const candidatePaths = [
    join(__dirname, '../../../assets/tesla-logo.png'),
    join(process.cwd(), 'dist/src/infrastructure/assets/tesla-logo.png'),
    join(process.cwd(), 'dist/infrastructure/assets/tesla-logo.png'),
    join(process.cwd(), 'src/infrastructure/assets/tesla-logo.png'),
  ];

  const logoPath = candidatePaths.find((path) => existsSync(path));
  if (!logoPath) {
    throw new Error(
      `Tesla logo asset not found. Checked paths: ${candidatePaths.join(', ')}`,
    );
  }

  return readFileSync(logoPath);
}
