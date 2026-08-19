export function parseAttachmentLinks(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(/\r?\n/)
    .map((link) => link.trim())
    .filter((link) => link.length > 0);
}

export function joinAttachmentLinks(links: string[]): string {
  return links.map((link) => link.trim()).filter((link) => link.length > 0).join('\n');
}

export function normalizeAttachmentLink(value: string): string {
  return value.trim();
}
