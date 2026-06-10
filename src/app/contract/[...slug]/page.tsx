import { contractSource } from "@/lib/contract-source";
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
  const page = contractSource.getPage(slug);
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
  return contractSource.generateParams();
}

export async function generateMetadata(props: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await props.params;
  const page = contractSource.getPage(slug);
  if (!page) notFound();
  return { title: page.data.title };
}
