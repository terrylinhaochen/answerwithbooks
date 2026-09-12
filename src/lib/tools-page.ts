import { buildInstallInstruction, getAgentSetup, canAdvanceSetup } from './tool-catalog.mjs';
import { readToolsAuthContext, toolsAuthPaths, isVerifiedToolsUser } from './tools-auth.mjs';
import { supabase } from './supabase';
import { setupToolAuth } from './tool-auth-form';

const setup = document.querySelector<HTMLDialogElement>('#tools-setup')!;
const dialogs = [...document.querySelectorAll<HTMLDialogElement>('[data-tools-dialog]')];
let step = 0;
let selectedAgent = '';
const accountForm = setupToolAuth(setup.querySelector<HTMLElement>('[data-tool-auth]')!, () => selectedAgent);
let signedIn = false;
let authRevision = 0;
const resumeContext = readToolsAuthContext(location.pathname, location.search);
let pendingResume = Boolean(resumeContext);
const next = setup.querySelector<HTMLButtonElement>('[data-setup-next]')!;
const back = setup.querySelector<HTMLButtonElement>('[data-setup-back]')!;
const titles = ['Which agent are you using?', 'Add AWB to your agent', 'Create your account', 'Choose your first task'];
let previousOverflow: string | null = null;
const openers = new WeakMap<HTMLDialogElement, HTMLElement>();

const openDialog = (dialog: HTMLDialogElement, opener: HTMLElement) => {
  if (dialog.open) return;
  if (previousOverflow === null) previousOverflow = document.body.style.overflow;
  for (const other of dialogs) if (other.open) other.close();
  openers.set(dialog, opener);
  dialog.showModal();
  document.body.style.overflow = 'hidden';
};

dialogs.forEach(dialog => {
  dialog.querySelector('[data-close-tools]')?.addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    if (!dialogs.some(item => item.open)) {
      document.body.style.overflow = previousOverflow ?? '';
      previousOverflow = null;
      openers.get(dialog)?.focus();
    }
    if (dialog === setup && !setup.open) {
      accountForm.clearPasswords();
      const url = new URL(location.href);
      for (const name of ['setup', 'agent']) url.searchParams.delete(name);
      history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
    }
  });
  // Native dialog supplies Escape dismissal and focus trapping.
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
});

const renderStep = (focus = true) => {
  setup.dataset.accountCard = String(step === 2 && !signedIn);
  setup.querySelectorAll<HTMLElement>('[data-setup-step]').forEach(panel => { panel.hidden = Number(panel.dataset.setupStep) !== step; });
  const title = setup.querySelector<HTMLElement>('[data-setup-title]')!;
  title.textContent = step === 1 && selectedAgent ? getAgentSetup(selectedAgent, location.origin).heading : step === 2 && signedIn ? 'Your AWB account' : titles[step];
  back.hidden = step === 0;
  next.textContent = step === 3 ? 'Done ✓' : 'Next →';
  next.disabled = !canAdvanceSetup(step, selectedAgent, signedIn);
  setup.querySelector<HTMLElement>('[data-step-count]')!.textContent = `${step + 1} of 4`;
  const progress = setup.querySelector<HTMLElement>('[data-setup-progress]')!;
  progress.setAttribute('aria-valuenow', String(step + 1));
  progress.querySelector<HTMLElement>('span')!.style.width = `${(step + 1) * 25}%`;
  setup.scrollTop = 0;
  if (selectedAgent && toolsAuthPaths(selectedAgent)) {
    const url = new URL(location.href);
    url.searchParams.set('agent', selectedAgent);
    url.searchParams.set('setup', ['install', 'install', 'account', 'try'][step]);
    history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  }
  if (focus) title.focus();
};

const selectAgent = (id: string) => {
  selectedAgent = id;
  const info = getAgentSetup(selectedAgent, location.origin);
  setup.querySelector<HTMLElement>('[data-selected-agent]')!.textContent = info.agent.name;
  setup.querySelector<HTMLElement>('[data-agent-guidance]')!.textContent = info.guidance;
  setup.querySelector<HTMLElement>('[data-agent-skill]')!.hidden = info.agent.method !== 'skill';
  setup.querySelector<HTMLElement>('[data-agent-upload]')!.hidden = info.agent.method !== 'upload';
  setup.querySelector<HTMLElement>('[data-agent-saved-skill]')!.hidden = info.agent.method !== 'saved-skill';
  setup.querySelectorAll<HTMLElement>('[data-selected-agent-icon]').forEach(icon => { icon.hidden = icon.dataset.selectedAgentIcon !== id; });
  setup.querySelector<HTMLElement>('[data-agent-note]')!.textContent = info.note;
  next.disabled = !canAdvanceSetup(step, selectedAgent, signedIn);
};
setup.querySelectorAll<HTMLInputElement>('input[name="tools-agent"]').forEach(input => {
  input.addEventListener('change', () => selectAgent(input.value));
});
next.addEventListener('click', () => {
  if (!canAdvanceSetup(step, selectedAgent, signedIn)) return;
  if (step === 3) { setup.close(); return; }
  step++; renderStep();
});
back.addEventListener('click', () => { if (step > 0) { step--; renderStep(); } });

const renderAccount = () => {
  setup.querySelector<HTMLElement>('[data-tools-account-guest]')!.hidden = signedIn;
  setup.querySelector<HTMLElement>('[data-tools-account-member]')!.hidden = !signedIn;
  if (step === 3 && !signedIn) step = 2;
  if (setup.open) renderStep(false);
};
async function refreshAccount() {
  const revision = ++authRevision;
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const result = sessionData.session ? await supabase.auth.getUser() : null;
    if (revision !== authRevision) return;
    signedIn = Boolean(result && !result.error && isVerifiedToolsUser(result.data.user));
    setup.querySelector<HTMLElement>('[data-tools-auth-status]')!.textContent = '';
  } catch {
    if (revision !== authRevision) return;
    signedIn = false;
    setup.querySelector<HTMLElement>('[data-tools-auth-status]')!.textContent = 'We couldn’t check your sign-in. Please try again.';
  }
  renderAccount();
  // Only the latest auth check may restore setup after an email callback.
  if (pendingResume && resumeContext && !setup.open) {
    pendingResume = false;
    selectAgent(resumeContext.agentId);
    const radio = setup.querySelector<HTMLInputElement>(`input[value="${resumeContext.agentId}"]`);
    if (radio) radio.checked = true;
    // Preserve the sign-in return step before showing task examples.
    step = new URLSearchParams(location.search).get('setup') === 'install' ? 1 : 2;
    openDialog(setup, document.querySelector<HTMLElement>('#install [data-open-setup]')!);
    renderStep();
  }
}
supabase.auth.onAuthStateChange(() => { window.setTimeout(() => { void refreshAccount(); }, 0); });

document.querySelectorAll<HTMLButtonElement>('[data-open-setup]').forEach(button => {
  button.disabled = typeof setup.showModal !== 'function';
  button.addEventListener('click', () => {
    pendingResume = false;
    // Return focus to the card if setup was opened from its detail panel.
    const parent = button.closest<HTMLDialogElement>('[data-tools-dialog]');
    const opener = (parent && openers.get(parent)) || button;
    step = 0; renderStep(false); openDialog(setup, opener); void refreshAccount();
  });
});

void refreshAccount();
document.querySelectorAll<HTMLButtonElement>('[data-open-tool]').forEach(button => {
  const dialog = document.getElementById(`tool-${button.dataset.openTool}`) as HTMLDialogElement;
  button.disabled = typeof dialog.showModal !== 'function';
  button.addEventListener('click', () => openDialog(dialog, button));
});

document.querySelectorAll<HTMLElement>('[data-dynamic-command="install"]').forEach(code => {
  try { code.textContent = buildInstallInstruction(location.origin); } catch { /* Keep the trusted canonical setup URL. */ }
});
document.querySelectorAll<HTMLButtonElement>('[data-copy-command]').forEach(button => {
  button.disabled = false;
  button.addEventListener('click', async () => {
    const block = button.closest<HTMLElement>('[data-tool-command]')!;
    const value = block.querySelector<HTMLElement>('[data-command-text]')!.textContent ?? '';
    const status = block.querySelector<HTMLElement>('[data-copy-status]')!;
    const fallback = block.querySelector<HTMLElement>('[data-copy-fallback]')!;
    const manual = fallback.querySelector<HTMLTextAreaElement>('textarea')!;
    try {
      // Prefer the browser's clipboard API. Embedded WebKit may report a
      // successful legacy copy without updating the browser clipboard.
      try { await navigator.clipboard.writeText(value); }
      catch {
        // The fallback field must be inside the active dialog (outside is inert).
        const field = document.createElement('textarea');
        field.value = value;
        field.setAttribute('aria-hidden', 'true');
        field.style.cssText = 'position:fixed;opacity:0;width:1px;height:1px;pointer-events:none';
        block.append(field);
        try { field.focus(); field.select(); if (!document.execCommand('copy')) throw new Error('Manual copy required'); }
        finally { field.remove(); button.focus(); }
      }
      fallback.hidden = true;
      status.textContent = 'Copied.';
    } catch {
      manual.value = value; fallback.hidden = false; manual.focus(); manual.select();
      status.textContent = 'Select and copy the text below.';
    }
  });
});

const redirectOldAnchor = () => {
  const target = ['#models', '#source-tools', '#capabilities'].includes(location.hash) ? '#available-tools' : location.hash === '#connect' ? '#install' : null;
  if (target) { history.replaceState(null, '', target); document.querySelector(target)?.scrollIntoView(); }
};
redirectOldAnchor();
window.addEventListener('hashchange', redirectOldAnchor);
