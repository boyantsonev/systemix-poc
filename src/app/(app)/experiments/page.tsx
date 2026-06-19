import Link from "next/link";
import { DocsPage, DocsBody, DocsTitle } from "fumadocs-ui/page";
import { experimentsSource } from "@/lib/experiments-source";

// The /experiments root — a live overview of the loop. experiments/ has no
// index.mdx, so this is rendered from the records themselves (can't drift).
export default function ExperimentsIndex() {
  const pages = experimentsSource.getPages();
  const experiments = pages
    .filter((p) => (p.data as unknown as Record<string, unknown>).type === "experiment")
    .sort((a, b) => a.url.localeCompare(b.url));

  return (
    <DocsPage>
      <DocsTitle>The loop</DocsTitle>
      <DocsBody>
        <p>
          The hypothesis → prototype → measure → decide loop for this instance. The
          earned memory lives in{" "}
          <Link href="/experiments/LEARNINGS">LEARNINGS</Link>.
        </p>
        <ul>
          {experiments.map((e) => {
            const d = e.data as unknown as Record<string, unknown>;
            return (
              <li key={e.url}>
                <Link href={e.url}>{String(d.title)}</Link>
              </li>
            );
          })}
        </ul>
      </DocsBody>
    </DocsPage>
  );
}
