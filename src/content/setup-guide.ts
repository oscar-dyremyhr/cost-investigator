export const setupGrantSql = `-- Run as an account or metastore admin.\nGRANT USE CATALOG ON CATALOG system TO \`cost-investigator-reader\`;\nGRANT USE SCHEMA, SELECT ON SCHEMA system.billing TO \`cost-investigator-reader\`;\nGRANT USE SCHEMA, SELECT ON SCHEMA system.lakeflow TO \`cost-investigator-reader\`;`;
export const setupPermissions = [
  ["SQL warehouse access", "Run read-only queries against the selected system tables.", "No permission to create, edit, or stop the warehouse."],
  ["system.billing", "Read usage rows and historical list prices.", "No access to business tables or customer data."],
  ["system.lakeflow", "Read job names and run context for job attribution.", "No permission to start, edit, or cancel jobs."],
  ["Workspace service principal", "Authenticate the product as a dedicated application identity.", "No workspace admin role or human password."],
];
