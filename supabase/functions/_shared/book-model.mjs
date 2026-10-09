// Provider boundary shared by the worker and the bounded model evaluation CLI.
// No prompts, source text, response contents, keys or provider error bodies enter metrics.
export function bookModelConfig(getEnv, kind = 'generation') {
  const model = (kind === 'review' && getEnv('BOOK_REVIEW_MODEL')) || getEnv('BOOK_PROCESSING_MODEL') || 'accounts/fireworks/models/glm-5p3-flash';
  if (!/^(?:accounts\/fireworks\/models\/)?[a-zA-Z0-9][a-zA-Z0-9._:-]{0,95}$/.test(model)) throw new Error('Invalid book processing model configuration.');
  const provider = model.startsWith('accounts/fireworks/models/') ? 'fireworks' : model.startsWith('gemini-') ? 'google' : 'openai';
  const reasoningModel = /^gpt-[5-9](?:[.-]|$)/.test(model) || /^o[1-9](?:[.-]|$)/.test(model);
  const effort = (kind === 'review' ? getEnv('BOOK_REVIEW_REASONING_EFFORT') : getEnv('BOOK_REASONING_EFFORT')) || (provider === 'google' ? (/^gemini-2\.5/.test(model) ? 'none' : 'minimal') : kind === 'generation' && /^gpt-5\.4-mini(?:-|$)/.test(model) ? 'none' : 'low');
  if (provider === 'google' && (!['none','minimal','low','medium','high'].includes(effort) || (!/^gemini-2\.5/.test(model) && effort === 'none'))) throw new Error('Invalid Gemini reasoning effort configuration.');
  if (provider === 'fireworks' && !['low','high','max'].includes(effort)) throw new Error('Fireworks book models require low, high, or max reasoning effort.');
  if (reasoningModel && !['none', 'low', 'medium', 'high', 'xhigh', 'max'].includes(effort)) throw new Error('Invalid book reasoning effort configuration.');
  if (/^gpt-6(?:\.1-sol|-astra)(?:-|$)/.test(model) && effort === 'none') throw new Error('This book model requires reasoning effort low or higher.');
  return {model, provider, reasoningModel, effort};
}

export function createBookModelClient({getEnv, fetchImpl = fetch, onUsage = (_metric) => {}, beforeCall = async (_request) => /** @type {string|null} */ (null), afterCall = async (_operation, _metric) => {}, now = Date.now}) {
  return async function modelJson(system, input, options = {}) {
    const kind = options.kind === 'review' ? 'review' : 'generation';
    const config = bookModelConfig(getEnv, kind);
    const key = getEnv(config.provider === 'fireworks' ? 'FIREWORKS_API_KEY' : config.provider === 'google' ? 'GEMINI_API_KEY' : 'OPENAI_API_KEY');
    if (!key) throw new Error('Book generation is not configured.');
    const started = now();
    const metric = {kind, provider: config.provider, requestedModel: config.model, model: null, elapsedMs: 0, outcome: 'error', inputTokens: null, outputTokens: null, cachedInputTokens: null, reasoningTokens: null};
    let operation=null;
    try {
      const body = {
        model: config.model, messages: [{role: 'system', content: config.provider === 'fireworks' && options.schema ? system+'\nReturn JSON matching this schema: '+JSON.stringify(options.schema) : system}, {role: 'user', content: input}],
        response_format: options.schema ? {type: 'json_schema', json_schema: {name: options.name || 'book_result', strict: true, schema: options.schema}} : {type: 'json_object'},
        ...(config.provider === 'fireworks' ? {max_tokens:6000,reasoning_effort:config.effort,service_tier:'default',context_length_exceeded_behavior:'error',perf_metrics_in_response:true} : config.provider === 'google' ? {max_tokens: 6000, reasoning_effort: config.effort} : config.reasoningModel ? {max_completion_tokens: 6000, reasoning_effort: config.effort} : {max_tokens: 6000}),
      };
      operation=await beforeCall({kind,model:config.model,inputBound:new TextEncoder().encode(JSON.stringify(body)).length+1024,outputBound:6000});
      let response;
      try {response = await fetchImpl(config.provider === 'fireworks' ? 'https://api.fireworks.ai/inference/v1/chat/completions' : config.provider === 'google' ? 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions' : 'https://api.openai.com/v1/chat/completions', {method: 'POST', redirect: 'error', headers: {Authorization: `Bearer ${key}`, 'Content-Type': 'application/json'}, body: JSON.stringify(body), signal: AbortSignal.timeout(60000)});}
      catch {throw new Error('The generation provider could not be reached. Please retry later.');}
      if (!response.ok) throw new Error(response.status === 429 ? 'The generation provider is busy or out of quota. Please retry later.' : `The generation provider could not complete this section (HTTP ${response.status}). Check the model configuration or retry later.`);
      let result;
      try {result = await response.json();} catch {throw new Error('The generation provider returned an unreadable response.');}
      if (typeof result.model === 'string' && /^(?:accounts\/fireworks\/models\/)?[a-zA-Z0-9][a-zA-Z0-9._:-]{0,95}$/.test(result.model)) metric.model = result.model;
      const count = n => Number.isSafeInteger(n) && n >= 0 ? n : null;
      metric.inputTokens = count(result.usage?.prompt_tokens);
      metric.outputTokens = count(result.usage?.completion_tokens);
      metric.cachedInputTokens = count(result.usage?.prompt_tokens_details?.cached_tokens ?? result.perf_metrics?.['cached-prompt-tokens'] ?? 0);
      metric.reasoningTokens = count(result.usage?.completion_tokens_details?.reasoning_tokens);
      const choice = result.choices?.[0];
      if (choice?.message?.refusal) throw new Error('The generation provider declined this section. Review its source before retrying.');
      if (choice?.finish_reason !== 'stop') throw new Error('The generated section was incomplete. Please retry.');
      let value;
      try {value = JSON.parse(choice.message.content);} catch {throw new Error('The generation provider returned invalid JSON.');}
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('The generation provider returned an invalid book object.');
      metric.outcome = 'complete';
      return value;
    } finally {
      metric.elapsedMs = Math.max(0, now() - started);
      if(operation!==null)await afterCall(operation,metric);
      // Telemetry failure must not consume another paid generation by failing the job.
      try {await onUsage(metric);} catch { /* The worker owns telemetry delivery. */ }
    }
  };
}
