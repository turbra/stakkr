const ALERT_TYPES = {
  NOTE: "note",
  IMPORTANT: "important",
  TIP: "tip",
  WARNING: "warning",
  CAUTION: "caution",
};

function upgradeAdmonitions() {
  for (const blockquote of document.querySelectorAll(
    ".markdown-body blockquote",
  )) {
    const firstParagraph = blockquote.querySelector("p");
    if (!firstParagraph) {
      continue;
    }

    const text = firstParagraph.textContent.trim();
    const match = text.match(
      /^\[!(NOTE|IMPORTANT|TIP|WARNING|CAUTION)\]\s*(.*)$/,
    );
    if (!match) {
      continue;
    }

    const [, label, remainder] = match;
    const callout = document.createElement("aside");
    callout.className = `stakkr-callout is-${ALERT_TYPES[label]}`;

    const title = document.createElement("span");
    title.className = "stakkr-callout-title";
    title.textContent = label;
    callout.appendChild(title);

    if (remainder) {
      firstParagraph.textContent = remainder;
    } else {
      firstParagraph.remove();
    }

    while (blockquote.firstChild) {
      callout.appendChild(blockquote.firstChild);
    }

    blockquote.replaceWith(callout);
  }
}

async function renderMermaid() {
  const blocks = [...document.querySelectorAll("pre code.language-mermaid")];
  if (!blocks.length) {
    return;
  }

  const mermaid = (
    await import("https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs")
  ).default;
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "loose",
    theme: "base",
    flowchart: {
      curve: "linear",
      htmlLabels: true,
    },
    themeVariables: {
      primaryColor: "#ffffff",
      primaryTextColor: "#151515",
      primaryBorderColor: "#c7c7c7",
      lineColor: "#4d4d4d",
      secondaryColor: "#f2f2f2",
      secondaryTextColor: "#151515",
      secondaryBorderColor: "#c7c7c7",
      tertiaryColor: "#fce3e3",
      tertiaryTextColor: "#151515",
      tertiaryBorderColor: "#ee0000",
      background: "#ffffff",
      mainBkg: "#ffffff",
      clusterBkg: "#ffffff",
      fontFamily: "RedHatText, 'Red Hat Text', Helvetica, Arial, sans-serif",
    },
  });

  for (const code of blocks) {
    const pre = code.closest("pre");
    if (!pre) {
      continue;
    }

    const container = document.createElement("div");
    container.className = "stakkr-mermaid mermaid";
    container.textContent = code.textContent;
    pre.replaceWith(container);
  }

  await mermaid.run({
    nodes: document.querySelectorAll(".stakkr-mermaid.mermaid"),
  });
}

async function initializeDocs() {
  upgradeAdmonitions();
  await renderMermaid();
}

initializeDocs().catch((error) => {
  console.error("[stakkr-docs]", error);
});
