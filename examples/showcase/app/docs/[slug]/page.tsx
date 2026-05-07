import React from "react";

const docs = {
  "getting-started": {
    title: "Getting started with Ultimate.js",
    body:
      "Create an app, keep server functions local, and ship split browser assets.",
  },
  "routing": {
    title: "Routing in Ultimate.js",
    body:
      "Routes are discovered from the app directory and prerendered during Rspack builds.",
  },
} as const;

type DocSlug = keyof typeof docs;

export function generateStaticParams(): Array<{ slug: DocSlug }> {
  return Object.keys(docs).map((slug) => ({ slug: slug as DocSlug }));
}

export default function DocsPage(
  { params }: { params?: { slug?: string } },
): React.ReactElement {
  const slug = params?.slug as DocSlug | undefined;
  const doc = slug ? docs[slug] : undefined;

  if (!doc) {
    return (
      <main className="app-shell">
        <section className="section">
          <h1>Doc not found</h1>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <section className="section">
        <div className="section-heading">
          <span className="eyebrow">Docs</span>
          <h1>{doc.title}</h1>
          <p>{doc.body}</p>
        </div>
      </section>
    </main>
  );
}
