import { asc } from "drizzle-orm";
import { getDb } from "../db";
import { cities, regions } from "../db/schema";

export type City = typeof cities.$inferSelect;
export type Region = typeof regions.$inferSelect & { cities: City[] };

export async function getRegionsWithCities(): Promise<Region[]> {
  const db = await getDb();
  const [rs, cs] = await Promise.all([
    db.select().from(regions).orderBy(asc(regions.sort), asc(regions.id)),
    db.select().from(cities).orderBy(asc(cities.sort), asc(cities.id)),
  ]);
  return rs.map((r) => ({ ...r, cities: cs.filter((c) => c.regionId === r.id) }));
}

export async function getCities() {
  const db = await getDb();
  return db.select().from(cities).orderBy(asc(cities.sort), asc(cities.id));
}
