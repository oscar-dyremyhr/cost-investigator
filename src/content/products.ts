/**
 * Friendly names for billing_origin_product values. A product not listed here
 * is shown by its code in a readable form, so a new Databricks product still
 * appears; it just has no hand-written name.
 */
const names: Record<string, string> = {
  JOBS: "Lakeflow Jobs",
  DLT: "Lakeflow pipelines",
  SQL: "Databricks SQL",
  ALL_PURPOSE: "All-purpose compute",
  MODEL_SERVING: "Model Serving",
  INTERACTIVE: "Serverless notebooks",
  DEFAULT_STORAGE: "Default storage",
  VECTOR_SEARCH: "AI Search",
  LAKEHOUSE_MONITORING: "Data quality monitoring",
  PREDICTIVE_OPTIMIZATION: "Predictive optimization",
  ONLINE_TABLES: "Online tables",
  FOUNDATION_MODEL_TRAINING: "Foundation model training",
  AGENT_EVALUATION: "Agent evaluation",
  FINE_GRAINED_ACCESS_CONTROL: "Fine-grained access control",
  DATA_CLASSIFICATION: "Data classification",
  DATA_QUALITY_MONITORING: "Data quality monitoring",
  DATA_SHARING: "Data sharing",
  AI_GATEWAY: "AI Gateway",
  AI_RUNTIME: "AI Runtime",
  NETWORKING: "Networking",
  APPS: "Databricks Apps",
  DATABASE: "Lakebase (provisioned)",
  LAKEBASE: "Lakebase",
  AI_FUNCTIONS: "AI Functions",
  AGENT_BRICKS: "Agent Bricks",
  CLEAN_ROOM: "Clean rooms",
  LAKEFLOW_CONNECT: "Lakeflow Connect",
  GENIE: "Genie",
  FEATURE_STORE: "Feature store",
};

export const productLabel = (code: string) =>
  names[code] ?? code.toLowerCase().replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
export const isKnownProduct = (code: string) => code in names;
