export function normalizeWhatsappUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  if (!trimmed) return null;

  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
    const allowed = hostname === 'wa.me'
      || hostname === 'chat.whatsapp.com'
      || hostname === 'whatsapp.com'
      || hostname === 'www.whatsapp.com';
    if (url.protocol !== 'https:' || !allowed || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function assertWhatsappUrl(value: string | null | undefined): string | null {
  return normalizeWhatsappUrl(value);
}
