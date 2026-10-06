import { getCollection } from 'astro:content';
import { publicBookPrompt } from '../../lib/public-book-agent';
export async function getStaticPaths() {
 return (await getCollection('books')).map(book => ({params: {slug: book.id}, props: {book}}));
}
export function GET({props}: {props: {book: Parameters<typeof publicBookPrompt>[0]}}) {
 return new Response(JSON.stringify({slug: props.book.id, prompt: publicBookPrompt(props.book)}), {headers: {'Content-Type': 'application/json; charset=utf-8'}});
}
