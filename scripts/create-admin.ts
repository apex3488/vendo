/**
 * Creates (or resets) the Super Admin account. This is the ONLY way to create the first
 * administrator: there is no public admin sign-up and no default password in the code.
 *
 * Usage (credentials are read from the environment, never from files in the repo):
 *   ADMIN_USERNAME=<login> ADMIN_PASSWORD=<password> npm run admin:create
 * Optional: ADMIN_EMAIL=<email> (enables password recovery by email).
 *
 * Stop `npm run dev` first when using the embedded local database (single-process lock).
 */
import { setDbForTests } from "../src/server/db";
import { upsertSuperAdmin } from "../src/server/services/users";
import { openDb } from "./_db";

const username = process.env.ADMIN_USERNAME?.trim();
const password = process.env.ADMIN_PASSWORD;
const email = process.env.ADMIN_EMAIL?.trim() || undefined;

if (!username || !password) {
  console.error("Set ADMIN_USERNAME and ADMIN_PASSWORD environment variables.");
  process.exit(1);
}
if (password.length < 8) {
  console.error("ADMIN_PASSWORD must be at least 8 characters.");
  process.exit(1);
}

async function main() {
  const { db, migrate, close } = await openDb();
  await migrate();
  setDbForTests(db);
  const res = await upsertSuperAdmin(username!, password!, email);
  console.log(res.created ? `Super Admin "${username}" created.` : `Super Admin "${username}" updated (password reset, sessions revoked).`);
  await close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
