import 'dotenv/config';
import { auth } from '../lib/firebase';

function parseArgs(): { uid: string; role: string } {
  const [, , uid, role] = process.argv;

  if (!uid || !role) {
    throw new Error('Usage: npm run auth:set-claims -- <uid> <role>');
  }

  return { uid, role };
}

async function run(): Promise<void> {
  const { uid, role } = parseArgs();
  const normalizedRole = role.trim().toUpperCase();

  await auth.setCustomUserClaims(uid, {
    role: normalizedRole,
    roles: [normalizedRole],
  });

  console.log(`Custom claims updated for ${uid} with role ${normalizedRole}.`);
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
