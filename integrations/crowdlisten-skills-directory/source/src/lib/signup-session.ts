export const SIGNUP_FLOW_KEY = 'awb:signup-flow:v2';
export const SIGNUP_FLOW_TTL = 30 * 60 * 1000;
export interface SignupFlowState {
  email: string;
  stage: 'account' | 'sent';
  savedAt: number;
  resendAt: number;
}

// This is temporary UI continuity, never proof of subscription or identity.
export function readSignupFlow(): SignupFlowState | null {
  try {
    sessionStorage.removeItem('awb:signup-flow:v1');
    const state = JSON.parse(sessionStorage.getItem(SIGNUP_FLOW_KEY) || 'null');
    const now = Date.now();
    if (state && typeof state.email === 'string' && state.email.length <= 254 &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email) &&
      ['account', 'sent'].includes(state.stage) &&
      Number.isFinite(state.savedAt) && state.savedAt <= now && now - state.savedAt < SIGNUP_FLOW_TTL &&
      Number.isFinite(state.resendAt) && state.resendAt <= now + 60000) return state;
    sessionStorage.removeItem(SIGNUP_FLOW_KEY);
  } catch { /* Storage may be unavailable. The flow still works in memory. */ }
  return null;
}

export function writeSignupFlow(state: SignupFlowState | null) {
  try {
    if (state) sessionStorage.setItem(SIGNUP_FLOW_KEY, JSON.stringify(state));
    else sessionStorage.removeItem(SIGNUP_FLOW_KEY);
  } catch { /* No persistent state is required. */ }
}
