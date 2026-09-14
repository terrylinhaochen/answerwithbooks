export function formatRunResult(run) {
  if (!run?.result?.answer) return '';
  const { answer, sources = [] } = run.result;
  const parts = [`# ${answer.title}`, answer.summary];
  for (const finding of answer.findings || []) parts.push(`## ${finding.title}\n${finding.detail}\n${(finding.evidence || []).join('\n')}`);
  for (const lead of answer.leads || []) parts.push(`## ${lead.name}\n${lead.url}\n${lead.reason}\n${(lead.evidence || []).join('\n')}`);
  if (answer.limitations?.length) parts.push(`## Limitations\n${answer.limitations.map(item => `- ${item}`).join('\n')}`);
  if (sources.length) parts.push(`## Sources\n${sources.map(source => `- ${source.title}: ${source.url}`).join('\n')}`);
  parts.push(`AWB task: ${run.id}`);
  return parts.join('\n\n');
}
