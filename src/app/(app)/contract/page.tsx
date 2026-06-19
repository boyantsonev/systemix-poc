import { DocsPage, DocsBody, DocsTitle } from "fumadocs-ui/page";
import { notFound } from "next/navigation";
import { contractSource } from "@/lib/contract-source";
import { getMDXComponents } from "@/mdx-components";

// The root contract page renders contract/index.mdx — the living agreement.
// Generated sections (goals index, records appendix) are React embeds inside
// the MDX, so the authored prose and the live state can't drift apart.
export default function ContractIndex() {
  const page = contractSource.getPage([]);
  if (!page) notFound();

  const MDX = page.data.body;

  return (
    <DocsPage toc={page.data.toc}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsBody>
        <MDX components={getMDXComponents()} />
      </DocsBody>
    </DocsPage>
  );
}
