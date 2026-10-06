// Clipboard API first; the fallback must be inside the active dialog, if any.
// Never persist or log the copied value, which may be a one-time credential.
export async function copyText(value, container) {
  try { await navigator.clipboard.writeText(value); return; } catch {}
  const previous = document.activeElement;
  const field = document.createElement('textarea');
  field.value = value;
  field.setAttribute('aria-label', 'Copy text');
  field.style.cssText = 'position:fixed;opacity:0;width:1px;height:1px;pointer-events:none';
  container.append(field);
  try {
    field.focus(); field.select();
    if (!document.execCommand('copy')) throw new Error('Copy was blocked. Select the text and copy it manually.');
  } finally { field.value = ''; field.remove(); if (previous?.isConnected) previous.focus(); }
}
