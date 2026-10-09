/** "wa.me" wants the number with its country code and nothing else. */
export function whatsappUrl(number: string, text: string) {
  const d = number.replace(/\D/g, '');
  return `https://wa.me/${d.length === 8 ? `216${d}` : d}?text=${encodeURIComponent(text)}`;
}
