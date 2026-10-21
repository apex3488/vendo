import { seedReferenceData } from "../src/server/seed/run";
import { openDb } from "./_db";

async function main() {
  const { db, migrate, close } = await openDb();
  await migrate();
  await seedReferenceData(db);
  console.log("Reference data seeded (locations, categories, plans, placements, pages, collections).");
  await close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
