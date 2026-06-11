import { contractSource } from "@/lib/contract-source";
import {
  DocsPage,
  DocsBody,
  DocsTitle,
} from "fumadocs-ui/page";
import { notFound } from "next/navigation";
import { getMDXComponents } from "@/mdx-components";
import { ContractMeta, type ContractData } from "@/components/system/ContractMeta";
import { VerdictStrip } from "@/components/contract/VerdictStrip";
import { PendingDecisions } from "@/components/contract/PendingDecisions";

export default async function Page(props: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await props.params;
  const page = contractSource.getPage(slug);
  if (!page) notFound();

  const MDX = page.data.body;
  const data = page.data as unknown as Record<string, unknown>;
  const isHypothesis = data.type === "hypothesis";

  return (
    <DocsPage toc={page.data.toc}>
      <DocsTitle>{page.data.title}</DocsTitle>
      {isHypothesis ? (
        <VerdictStrip data={data} />
      ) : (
        <ContractMeta data={page.data as unknown as ContractData} />
      )}
      <DocsBody>
        <MDX components={getMDXComponents()} />
        {isHypothesis && data.id ? (
          <div className="mt-10">
            <PendingDecisions hypothesis={String(data.id)} />
          </div>
        ) : null}
      </DocsBody>
    </DocsPage>
  );
}

export function generateStaticParams() {
  // The root index.mdx (slug: []) is served by ../page.tsx, not this catch-all.
  return contractSource.generateParams().filter((p) => p.slug.length > 0);
}

export async function generateMetadata(props: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await props.params;
  const page = contractSource.getPage(slug);
  if (!page) notFound();
  return { title: page.data.title };
}
