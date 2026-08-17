export function formatAliasTable(
  rows: Array<{ alias: string; allowedDomains: string[]; updatedAt: string }>,
): string {
  if (rows.length === 0) {
    return "No secrets stored.";
  }

  const headers = ["ALIAS", "DOMAINS", "UPDATED"] as const;
  const domainText = (row: { allowedDomains: string[] }): string =>
    row.allowedDomains.length > 0 ? row.allowedDomains.join(",") : "-";

  const widths = [
    Math.max(headers[0].length, ...rows.map((row) => row.alias.length)),
    Math.max(headers[1].length, ...rows.map((row) => domainText(row).length)),
    Math.max(headers[2].length, ...rows.map((row) => row.updatedAt.length)),
  ];

  const line = (cols: string[]): string =>
    cols.map((col, index) => col.padEnd(widths[index])).join("  ");

  return [
    line([...headers]),
    ...rows.map((row) => line([row.alias, domainText(row), row.updatedAt])),
  ].join("\n");
}
