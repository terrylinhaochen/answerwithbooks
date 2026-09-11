// Verified public publication behind https://substack.com/@terrychen.
const signup = new URL(import.meta.env.PUBLIC_NEWSLETTER_SIGNUP_URL?.trim() || 'https://terrychen.substack.com/subscribe');
const embed = new URL(import.meta.env.PUBLIC_NEWSLETTER_EMBED_URL?.trim() || 'https://terrychen.substack.com/embed');
for (const url of [signup, embed]) {
  if (url.protocol !== 'https:' || !url.hostname.endsWith('.substack.com') || url.username || url.password) {
    throw new Error('Newsletter signup and embed URLs must use a public HTTPS Substack publication.');
  }
}
if (embed.pathname !== '/embed' || signup.hostname !== embed.hostname) {
  throw new Error('Use the official /embed URL and signup URL for the same Substack publication.');
}
export const newsletterSignupUrl = signup.href;
export const newsletterEmbedUrl = embed.href;
