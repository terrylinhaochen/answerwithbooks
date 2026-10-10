// Separate the reader overview from the exhaustive reference material.
export function bookReadingSections(markdown='') {
 const body=markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/,'');
 return body.split(/(?=^## )/m).map(block=>{
  const match=block.match(/^## ([^\n]+)\n/);
  const title=match?.[1]?.trim()||'';
  const text=match?block.slice(match[0].length).trim():block.trim();
  return {title,text,detailed:['Core lessons','Key frameworks'].includes(title)};
 }).filter(section=>section.text&&!['Use this book in an agent','When to reach for this book','Source and coverage'].includes(section.title));
}
export function readingOverviewWords(sections) {
 return sections.filter(section=>!section.detailed).map(section=>section.text).join(' ').trim().split(/\s+/).filter(Boolean).length;
}
