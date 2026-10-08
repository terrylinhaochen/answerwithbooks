const string = {type: 'string', minLength: 1};
const nullableString = {type: ['string', 'null']};
const object = properties => ({type: 'object', properties, required: Object.keys(properties), additionalProperties: false});
const array = (items, bounds = {}) => ({type: 'array', items, ...bounds});
const refs = array(object({startLine: {type: 'integer'}, endLine: {type: 'integer'}}), {minItems: 1});
export const sectionSchema = object({
  title: nullableString, author: nullableString, summary: string, sourceRefs: refs,
  ideas: array(object({name: string, explanation: string, whenToUse: string, decisionRule: nullableString, steps: array(string, {minItems: 1}), limits: string, sourceRefs: refs,
    applicationBasis: {type: 'string', enum: ['source-instruction', 'derived-application']}}), {maxItems: 5}),
  antiPatterns: array(object({name: string, why: string, instead: string, sourceRefs: refs}), {maxItems: 5}),
  workedExamples: array(object({title: string, scenario: string, application: string, sourceRefs: refs}), {maxItems: 5}),
});
export function sectionSchemaFor(chunk) {
  const schema=structuredClone(sectionSchema),properties=schema.properties;
  for(const sourceRefs of [properties.sourceRefs,properties.ideas.items.properties.sourceRefs,properties.antiPatterns.items.properties.sourceRefs,properties.workedExamples.items.properties.sourceRefs]) {
    sourceRefs.maxItems=8;
    for(const coordinate of Object.values(sourceRefs.items.properties)){coordinate.minimum=chunk.start;coordinate.maximum=chunk.end;}
  }
  return schema;
}
export const fidelitySchema = object({supported: {type: 'boolean'}, issues: array(string)});
export function citedReviewSchema(ids) {
  return object({...fidelitySchema.properties, checks: array(object({id:{type:'string',enum:ids},supported:{type:'boolean'},reason:string}),{minItems:ids.length,maxItems:ids.length})});
}
const term = object({term: string, definition: string, chapterIds: array(string)});
export const overviewSchema = object({summary: string, terms: array(term, {maxItems: 8})});
export const synthesisSchema = object({oneLiner: string, readIf: string, thesis: string, tags: array(string), year: {type: ['integer', 'null']}, glossary: array(term)});
