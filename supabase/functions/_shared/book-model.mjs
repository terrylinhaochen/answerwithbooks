// Provider boundary shared by the worker and the bounded model evaluation CLI.
// No prompts, source text, response contents, keys or provider error bodies enter metrics.
export function bookModelConfig(getEnv, kind = 'generation') {
  const model = (kind === 'review' && getEnv('BOOK_REVIEW_MODEL')) || getEnv('BOOK_PROCESSING_MODEL') || 'gpt-4.1-mini';
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,95}$/.test(model)) throw new Error('Invalid book processing model configuration.');
  const reasoningModel = /^gpt-[5-9](?:[.-]|$)/.test(model) || /^o[1-9](?:[.-]|$)/.test(model);
  const effort = (kind === 'review' ? getEnv('BOOK_REVIEW_REASONING_EFFORT') : getEnv('BOOK_REASONING_EFFORT')) || 'low';
  if (reasoningModel && !['none', 'low', 'medium', 'high', 'xhigh', 'max'].includes(effort)) throw new Error('Invalid book reasoning effort configuration.');
  if (/^gpt-6(?:\.1-sol|-astra)(?:-|$)/.test(model) && effort === 'none') throw new Error('This book model requires reasoning effort low or higher.');
  return {model, reasoningModel, effort};
}

export function createBookModelClient({getEnv, fetchImpl = fetch, onUsage = (_metric) => {}, now = Date.now}) {
  return async function modelJson(system, input, options = {}) {
    const kind = options.kind === 'review' ? 'review' : 'generation';
    const config = bookModelConfig(getEnv, kind);
    const key = getEnv('OPENAI_API_KEY');
    if (!key) throw new Error('Book generation is not configured.');
    const started = now();
    const metric = {kind, requestedModel: config.model, model: null, elapsedMs: 0, outcome: 'error', inputTokens: null, outputTokens: null, cachedInputTokens: null, reasoningTokens: null};
    try {
      const body = {
        model: config.model, messages: [{role: 'system', content: system}, {role: 'user', content: input}],
        response_format: options.schema ? {type: 'json_schema', json_schema: {name: options.name || 'book_result', strict: true, schema: options.schema}} : {type: 'json_object'},
        ...(config.reasoningModel ? {max_completion_tokens: 6000, reasoning_effort: config.effort} : {max_tokens: 6000}),
      };
      let response;
      try {response = await fetchImpl('https://api.openai.com/v1/chat/completions', {method: 'POST', redirect: 'error', headers: {Authorization: `Bearer ${key}`, 'Content-Type': 'application/json'}, body: JSON.stringify(body), signal: AbortSignal.timeout(60000)});}
      catch {throw new Error('The generation provider could not be reached. Please retry later.');}
      if (!response.ok) throw new Error(response.status === 429 ? 'The generation provider is busy or out of quota. Please retry later.' : `The generation provider could not complete this section (HTTP ${response.status}). Check the model configuration or retry later.`);
      let result;
      try {result = await response.json();} catch {throw new Error('The generation provider returned an unreadable response.');}
      if (typeof result.model === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,95}$/.test(result.model)) metric.model = result.model;
      const count = n => Number.isSafeInteger(n) && n >= 0 ? n : null;
      metric.inputTokens = count(result.usage?.prompt_tokens);
      metric.outputTokens = count(result.usage?.completion_tokens);
      metric.cachedInputTokens = count(result.usage?.prompt_tokens_details?.cached_tokens);
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
      // Telemetry failure must not consume another paid generation by failing the job.
      try {onUsage(metric);} catch { /* The worker owns telemetry delivery. */ }
    }
  };
}
