import { systemSource } from "@/lib/system-source";
import {
  DocsPage,
  DocsBody,
  DocsTitle,
} from "fumadocs-ui/page";
import { notFound } from "next/navigation";
import { getMDXComponents } from "@/mdx-components";
import { ContractMeta, type ContractData } from "@/components/system/ContractMeta";

export default async function Page(props: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await props.params;
  const page = systemSource.getPage(slug);
  if (!page) notFound();

  const MDX = page.data.body;

  return (
    <DocsPage toc={page.data.toc}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <ContractMeta data={page.data as unknown as ContractData} />
      <DocsBody>
        <MDX components={getMDXComponents()} />
      </DocsBody>
    </DocsPage>
  );
}

export function generateStaticParams() {
  return systemSource.generateParams();
}

export async function generateMetadata(props: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await props.params;
  const page = systemSource.getPage(slug);
  if (!page) notFound();
  return { title: page.data.title };
}
