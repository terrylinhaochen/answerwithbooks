// Display-only reflow: retain paragraphs, join page breaks inside unfinished sentences.
export function formatOriginalText(text){
 return String(text).replace(/\r\n?/g,'\n')
  .replace(/([^\n])\n(?=[^\n])/g,'$1 ')
  .replace(/([^.!?:;…"”’'\s])\s*\n(?:[ \t]*\n)+[ \t]*/g,'$1 ')
  .replace(/([.!?]["”’']?) {3,}(?=[A-Z“"‘])/g,'$1\n\n')
  .replace(/\n[ \t]*\n(?:[ \t]*\n)+/g,'\n\n').trim();
}
