// Account attribution only. Never send email, tokens, or account IDs to analytics.
const entrypoints = new Set(['agent', 'shelf', 'onboarding', 'upload', 'tools']);
export function signupMetadata(from) {
  return { awb_signup: { version: 1, product: 'answerwithbooks', entrypoint: entrypoints.has(from) ? from : 'website' } };
}
