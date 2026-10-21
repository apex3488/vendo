import { openDb } from "./_db";

async function main() {
  const { migrate, close } = await openDb();
  await migrate();
  console.log("Migrations applied.");
  await close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
