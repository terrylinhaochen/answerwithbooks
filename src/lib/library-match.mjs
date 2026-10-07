// A filename can suggest a public title, never prove the source or edition.
// Keep matching local and exact; the reader explicitly chooses the saved copy.
const normalize=value=>value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
export function matchLibraryFile(filename,catalog) {
 const name=normalize(filename.replace(/\.[^.]+$/,''));
 const matches=catalog.filter(book=>[book.title,`${book.title} ${book.author}`,`${book.author} ${book.title}`].some(value=>normalize(value)===name));
 return matches.length===1?matches[0]:null;
}
