export const embeddingModel = 'text-embedding-3-small';
export const embeddingDimensions = 512;
export const embeddingVersion = `${embeddingModel}:${embeddingDimensions}:v1`;
export async function embedBookText(texts, {key, fetchImpl = fetch, timeoutMs = 30000} = {}) {
  if (!key) throw new Error('Semantic retrieval is not configured.');
  if (!Array.isArray(texts) || !texts.length || texts.length > 16 || texts.some(s => typeof s !== 'string' || !s.trim() || s.length > 6000)) throw new Error('Invalid embedding input.');
  let response;
  try {
    response = await fetchImpl('https://api.openai.com/v1/embeddings', {method:'POST',redirect:'error',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},
      body:JSON.stringify({model:embeddingModel,dimensions:embeddingDimensions,input:texts,encoding_format:'float'}),signal:AbortSignal.timeout(timeoutMs)});
  } catch { throw new Error('Semantic retrieval provider could not be reached.'); }
  if (!response.ok) throw new Error(`Semantic retrieval provider unavailable (HTTP ${response.status}).`);
  const result = await response.json();
  if (!Array.isArray(result.data) || result.data.length !== texts.length) throw new Error('Incomplete embedding response.');
  const ordered = [...result.data].sort((a,b) => a.index-b.index);
  if (ordered.some((row,index) => row.index !== index || !Array.isArray(row.embedding) || row.embedding.length !== embeddingDimensions || row.embedding.some(v => !Number.isFinite(v)) || !row.embedding.some(v => v !== 0))) throw new Error('Invalid embedding response.');
  return ordered.map(row => row.embedding);
}
