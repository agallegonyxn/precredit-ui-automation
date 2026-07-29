export function uniqueTestEmail(prefix = 'qaprc') {
  return `${prefix}${Date.now()}@yopmail.com`;
}
