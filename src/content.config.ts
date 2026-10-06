import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const books = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/books' }),
  schema: z.object({
    title: z.string(),
    author: z.string(),
    year: z.number(),
    oneLiner: z.string(),
    readIf: z.string(),
    tags: z.array(z.string()).default([]),
    featured: z.boolean().default(false),
    order: z.number().default(99),
    amazon: z.object({
      asin: z.string().regex(/^[A-Z0-9]{10}$/),
      edition: z.string().min(1),
      verifiedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      source: z.string().url().refine((value) => new URL(value).hostname === 'www.amazon.com'),
    }).optional(),
  }),
});

const answers = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/answers' }),
  schema: z.object({
    question: z.string(),
    description: z.string(),
    books: z.array(z.string()).min(1),
    date: z.coerce.date(),
    featured: z.boolean().default(false),
    tags: z.array(z.string()).default([]),
  }),
});

export const collections = { books, answers };
