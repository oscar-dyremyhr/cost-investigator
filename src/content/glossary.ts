/**
 * Glossary: every technical word the app may show, with a one-sentence,
 * plain-language explanation. Used by <Term> and <GlossaryText>.
 */
export const glossary = {
  dbu: {
    term: "DBU",
    aliases: ["DBU", "DBUs", "Databricks Unit", "Databricks Units"],
    definition: "The unit Databricks uses to meter compute. More or bigger machines running for longer means more DBUs.",
  },
  sku: {
    term: "SKU",
    aliases: ["SKU", "SKUs"],
    definition: "The name of one priced product on the Databricks bill, such as jobs compute on the Premium tier.",
  },
  listPrice: {
    term: "List price",
    aliases: ["list price", "list prices", "list cost", "list-price"],
    definition: "The public price before any discount, credit or tax. Your invoice can be lower or higher.",
  },
  systemTables: {
    term: "System tables",
    aliases: ["system tables", "system table"],
    definition: "Read-only tables Databricks keeps about your own account, such as what was used and what it costs.",
  },
  workspace: {
    term: "Workspace",
    aliases: ["workspace", "workspaces"],
    definition: "One Databricks environment where your teams run their data work. Most companies have a few.",
  },
  customTags: {
    term: "Custom tags",
    aliases: ["custom tag", "custom tags", "untagged"],
    definition: "Labels your teams put on compute, such as team or environment, so spend can be traced to an owner.",
  },
  billingProduct: {
    term: "Billing product",
    aliases: ["billing product", "billing products", "billing origin product"],
    definition: "The Databricks product that caused the usage, such as Jobs, SQL or Model Serving.",
  },
  jobCompute: {
    term: "Job compute",
    aliases: ["job compute", "jobs compute"],
    definition: "Machines that start for one scheduled job and stop when it ends.",
  },
  allPurposeCompute: {
    term: "All-purpose compute",
    aliases: ["all-purpose compute", "all-purpose cluster", "all-purpose clusters"],
    definition: "Shared machines people use for notebooks and exploring. They cost more per DBU than job compute.",
  },
  sqlWarehouse: {
    term: "SQL warehouse",
    aliases: ["SQL warehouse", "SQL warehouses"],
    definition: "The compute that runs SQL queries and dashboards in Databricks.",
  },
  serverless: {
    term: "Serverless",
    aliases: ["serverless"],
    definition: "Compute that Databricks starts and stops for you, billed only while work runs.",
  },
  autoStop: {
    term: "Auto-stop",
    aliases: ["auto-stop", "auto-termination"],
    definition: "A setting that turns compute off after it has been idle for a set number of minutes.",
  },
  runRate: {
    term: "Run rate",
    aliases: ["run rate", "run-rate"],
    definition: "A simple forecast: spend so far, divided by days passed, times the days in the month.",
  },
  budget: {
    term: "Budget",
    aliases: ["budget", "budgets"],
    definition: "The amount you plan to spend in a month. It is your own guardrail, not a Databricks limit.",
  },
  attribution: {
    term: "Attribution",
    aliases: ["attribution", "attributed"],
    definition: "Linking a cost to the job, team or workspace that caused it.",
  },
} as const;

export type GlossaryKey = keyof typeof glossary;

const aliasToKey = new Map<string, GlossaryKey>();
for (const [key, entry] of Object.entries(glossary)) {
  for (const alias of entry.aliases) aliasToKey.set(alias.toLowerCase(), key as GlossaryKey);
}

const escaped = [...aliasToKey.keys()]
  .sort((a, b) => b.length - a.length)
  .map((a) => a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

/** Splits text so glossary words become their own parts (capturing group keeps them). */
export const glossaryPattern = new RegExp(`\\b(${escaped.join("|")})\\b`, "gi");

export function lookupTerm(word: string): GlossaryKey | undefined {
  return aliasToKey.get(word.toLowerCase());
}
