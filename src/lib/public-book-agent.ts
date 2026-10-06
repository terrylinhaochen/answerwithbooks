import { bookAgentPrompt } from '../../supabase/functions/_shared/book-handoff.mjs';

type PublicBook = { id: string; data: { title: string; author: string }; body?: string };
export const bookTasks: Record<string, { label: string; prompt: string }> = {
 'the-mom-test': { label: 'Plan a customer interview.', prompt: 'Help me prepare a customer interview. First ask about my product and what I need to learn. Use The Mom Test to draft questions about specific past behavior, flag leading questions, and give me a checklist for reviewing the evidence afterward.' },
 'thinking-fast-and-slow': { label: 'Review an important decision.', prompt: 'Help me review a decision. First ask about the options, stakes, and evidence. Use the supplied book to check framing, overconfidence, and missing base rates. Separate facts from assumptions and suggest a concrete next step.' },
 'designing-your-life': { label: 'Prototype a next career move.', prompt: 'Help me explore my next career move. First ask about my situation, interests, and constraints. Apply the supplied Designing Your Life methods to propose a few possible directions and small experiments I can run before committing.' },
 'atomic-habits': { label: 'Design a habit I can keep.', prompt: 'Help me make one habit easier to maintain. First ask about the behavior, my routine, and where I get stuck. Apply the supplied Atomic Habits methods to propose a small starting action, a clear cue, and an environment change. Give me a one-week experiment.' },
 'deep-work': { label: 'Make a realistic focus plan.', prompt: 'Help me plan a week of focused work. First ask about the work that matters, my schedule, and unavoidable interruptions. Apply the supplied Deep Work methods to create realistic focus blocks, boundaries, and a way to review what worked.' },
};
export function publicBookTask(book: PublicBook) {
 return bookTasks[book.id] ?? { label: 'Apply this book to my next task.', prompt: 'First ask what I am trying to accomplish and what constraints matter. Then apply the relevant methods in the supplied book notes to propose a concrete plan, identify trade-offs, and give me a next step. Cite the supplied notes and flag gaps.' };
}
export function publicBookPrompt(book: PublicBook) {
 return `${bookAgentPrompt({title:book.data.title,author:book.data.author,url:`https://answerwithbooks.com/books/${book.id}/`,digest:book.body ?? ''})}\n\nMY TASK\n${publicBookTask(book).prompt}`;
}
