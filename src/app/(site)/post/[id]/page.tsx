import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ListingWizard } from "@/components/post/listing-wizard";
import { getI18n } from "@/lib/i18n/server";
import { requireUserPage } from "@/server/auth/current";
import { ServiceError } from "@/server/errors";
import { loadWizard } from "../load";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.post.editTitle, robots: { index: false } };
}

export default async function EditListingPage({ params }: PageProps<"/post/[id]">) {
  const { id } = await params;
  const user = await requireUserPage(`/post/${id}`);
  const listingId = Number(id);
  if (!Number.isSafeInteger(listingId) || listingId <= 0) notFound();
  let data;
  try {
    data = await loadWizard(user.id, listingId);
  } catch (e) {
    if (e instanceof ServiceError) notFound();
    throw e;
  }
  if (data.initial.status === "blocked") notFound();
  return (
    <div className="container-x py-6 md:py-10">
      <ListingWizard key={listingId} {...data} />
    </div>
  );
}
