import uploadedBooks from './uploaded-books.json' with {type:'json'};
// Approved print design is the default for local and production builds.
export const printStudyEnabled = true;
export const printBooks=[
 {slug:'shoe-dog',id:'c9d37d22-0c77-4c6a-97b3-158f3f2a1719',title:'Shoe Dog',author:'Phil Knight',year:2016,color:'#b53321',paper:'#eee7d6',art:'shoe-grain-v9.png',label:'A worthwhile pursuit',question:'How do I find something worthwhile doing?',oneLiner:'Phil Knight traces the uncertain beginnings of Nike and the people who helped him keep going.'},
 {slug:'invention-a-life',id:'9004d927-7785-4c3a-acf1-647f732485f7',title:'Invention: A Life',author:'James Dyson',year:2021,color:'#2434ad',paper:'#eeebdf',art:'invention-grain-v9.png',label:'Making ideas real',question:'When should I keep experimenting?',oneLiner:'James Dyson follows practical frustrations through prototypes, failures, and the work of building a company.'},
 {slug:'open',id:'80c10600-ed6e-43ce-90b5-ef1b19159566',title:'Open',author:'Andre Agassi',year:2009,color:'#493668',paper:'#eee7de',art:'open-grain-v9.png',label:'Choosing your life',question:'Whose ambition am I pursuing?',oneLiner:'Andre Agassi explores the tension between extraordinary success and finding a life of his own.'},
];
const featuredPrintBooks=[
 {slug:'the-mom-test',title:'The Mom Test',author:'Rob Fitzpatrick',color:'#25645c',paper:'#eee7d6',art:'the-mom-test-grain.png',category:'Startups'},
 {slug:'thinking-fast-and-slow',title:'Thinking, Fast and Slow',author:'Daniel Kahneman',color:'#493668',paper:'#eee7de',art:'thinking-fast-and-slow-grain.png',category:'Judgment'},
 {slug:'zero-to-one',title:'Zero to One',author:'Peter Thiel with Blake Masters',color:'#b53321',paper:'#eee7d6',art:'zero-to-one-grain.png',category:'Business'},
 {slug:'the-wisdom-of-crowds',title:'The Wisdom of Crowds',author:'James Surowiecki',color:'#2434ad',paper:'#eeebdf',art:'the-wisdom-of-crowds-grain.png',category:'Collective intelligence'},
];
export function printBook(title,author='') {return printStudyEnabled?[...uploadedBooks,...printBooks,...featuredPrintBooks].find(b=>b.title.toLowerCase()===String(title).toLowerCase()&&(!author||b.author.toLowerCase()===String(author).toLowerCase())):undefined;}
export function printGuideMarkup(question){
 if(!printStudyEnabled)return null;
 const sharing=question==='Why are people willing to share their own insights and learnings on the public web?';
 const work=question==='How do I find something worthwhile doing?';
 if(!sharing&&!work)return null;
 return `<div class="print-guide" aria-hidden="true"><div class="print-guide-paper"><div class="print-guide-meta"><span>Answer with Books</span><span>Reading guide</span></div><div class="print-guide-title"><small>A question to live with</small><span>${sharing?'Passing<br>it on.':'Work worth<br>doing.'}</span></div><div class="print-guide-art"><img src="/print-study/${sharing?'passing-it-on.png':'guide-work-vermilion-v8.png'}" alt="" decoding="async" loading="lazy" /></div><div class="print-guide-foot"><span>${sharing?'Ideas, shared.':'Knight · Dyson · Agassi'}</span><span>Original passages. New connections.</span></div></div></div>`;
}

// These editorial guides share the approved question-first print layout.
const printAnswers = {
 'how-to-tell-whether-your-value-proposition-is-actually-different': {
  title:'Actually<br>different?',art:'guide-different-grain.png',ink:'#2434ad',
  eyebrow:'Test the difference',footer:'Rumelt · Fitzpatrick · Heath',
 },
 'how-to-fix-user-interviews-that-are-not-teaching-you-anything': {
  title:'Ask. Listen.<br>Learn.',art:'the-mom-test-grain.png',ink:'#25645c',
  eyebrow:'Better conversations',footer:'Rob Fitzpatrick',
 },
 'how-to-tell-whether-to-pivot-or-keep-going': {
  title:'Stay the<br>course?',art:'guide-pivot-grain.png',ink:'#d93825',
  eyebrow:'Persistence or denial',footer:'Kuhn · Kahneman',
 },
};
export function printAnswerMarkup(slug) {
 const cover = printStudyEnabled ? printAnswers[slug] : null;
 if (!cover) return null;
 // Values are curated constants, never user-supplied HTML.
 return `<div class="print-guide" style="--print-ink:${cover.ink}" aria-hidden="true"><div class="print-guide-paper"><div class="print-guide-meta"><span>Answer with Books</span><span>Reading guide</span></div><div class="print-guide-title"><small>${cover.eyebrow}</small><span>${cover.title}</span></div><div class="print-guide-art"><img src="/print-study/${cover.art}" alt="" decoding="async" loading="lazy" width="1280" height="1280" /></div><div class="print-guide-foot"><span>${cover.footer}</span><span>Ideas for your work.</span></div></div></div>`;
}
