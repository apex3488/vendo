import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { tr } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { getPage, listPages } from "@/server/services/content";

export async function generateMetadata({ params }: PageProps<"/p/[slug]">): Promise<Metadata> {
  const page = await getPage((await params).slug);
  if (!page) return {};
  const { locale } = await getI18n();
  return { title: tr(page.title, locale), alternates: { canonical: `/p/${page.slug}` } };
}

/** Renders admin-edited text safely: no HTML is interpreted, only "## " headings, "- " lists and paragraphs. */
function RichText({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/);
  return (
    <div className="prose-vendo">
      {blocks.map((block, i) => {
        const lines = block.split("\n").filter((l) => l.trim());
        if (!lines.length) return null;
        const heading = lines[0]!.startsWith("## ") ? lines.shift()!.slice(3) : null;
        const isList = lines.length > 0 && lines.every((l) => l.startsWith("- "));
        return (
          <div key={i}>
            {heading && <h2>{heading}</h2>}
            {isList ? (
              <ul>
                {lines.map((l, j) => (
                  <li key={j}>{l.slice(2)}</li>
                ))}
              </ul>
            ) : (
              lines.length > 0 && <p>{lines.join(" ")}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default async function ContentPage({ params }: PageProps<"/p/[slug]">) {
  const { slug } = await params;
  const page = await getPage(slug);
  if (!page || page.kind !== "page") notFound();
  const { locale } = await getI18n();
  const faqs = slug === "help" ? (await listPages("faq")).filter((f) => f.isPublished) : [];
  return (
    <article className="container-x max-w-3xl pt-8 md:pt-12">
      <h1 className="t-1">{tr(page.title, locale)}</h1>
      <div className="mt-6">
        <RichText text={tr(page.body, locale)} />
      </div>
      {faqs.length > 0 && (
        <section className="mt-10">
          <h2 className="t-2 mb-4">FAQ</h2>
          <div className="divide-y divide-line rounded-[var(--radius-lg)] border border-line bg-surface">
            {faqs.map((f) => (
              <details key={f.id} className="px-5 py-4">
                <summary className="cursor-pointer font-semibold">{tr(f.title, locale)}</summary>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-2">{tr(f.body, locale)}</p>
              </details>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
