import type { Metadata } from "next";
import { ListingWizard } from "@/components/post/listing-wizard";
import { getI18n } from "@/lib/i18n/server";
import { requireUserPage } from "@/server/auth/current";
import { loadWizard } from "./load";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.post.title, robots: { index: false } };
}

export default async function NewListingPage() {
  const user = await requireUserPage("/post");
  const data = await loadWizard(user.id, null);
  return (
    <div className="container-x py-6 md:py-10">
      <ListingWizard {...data} />
    </div>
  );
}
