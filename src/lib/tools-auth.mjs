import { agentOptions } from './tool-catalog.mjs';

// Only a known agent can be carried through email sign-in. No arbitrary return URLs.
export function toolsAuthPaths(agentId) {
  if (!agentOptions.some(agent => agent.id === agentId && agent.available)) return null;
  const agent = encodeURIComponent(agentId);
  return {
    confirm: `/auth/confirm/?from=tools&agent=${agent}`,
    returnTo: `/tools/?setup=try&agent=${agent}`,
  };
}

export function readToolsAuthContext(pathname, search) {
  const params = new URLSearchParams(search);
  const fromTools = pathname === '/tools/' && ['install', 'account', 'try'].includes(params.get('setup'));
  const fromCallback = pathname === '/auth/confirm/' && params.get('from') === 'tools';
  if (!fromTools && !fromCallback) return null;
  const paths = toolsAuthPaths(params.get('agent'));
  return paths ? { ...paths, agentId: params.get('agent') } : null;
}

export function isVerifiedToolsUser(user) {
  return Boolean(user && typeof user.id === 'string' && user.id &&
    typeof user.email_confirmed_at === 'string' && user.email_confirmed_at && user.is_anonymous !== true);
}
