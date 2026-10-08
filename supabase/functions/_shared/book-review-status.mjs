export function sourceReview(artifacts) {
  try {const value=JSON.parse(artifacts?.['quality-review.json']||'{}');return value && typeof value==='object' ? value : {};} catch {return {};}
}
export function hasCurrentSourceReview(artifacts) {
  const review=sourceReview(artifacts);
  return review.version===3 && Number.isSafeInteger(review.totalSections) && review.totalSections>0 && review.sectionsReviewed===review.totalSections;
}
export function sourceReviewNotice(artifacts) {
  const review=sourceReview(artifacts);
  if(hasCurrentSourceReview(artifacts))return 'This version passed automated checks of each note against its cited source excerpts. Review important claims against the bundled source; automated checks can miss errors.';
  if(review.version===3)return 'This version includes notes that have not received the current checks against their cited source excerpts. Review the coverage in quality-review.json and check important claims against the source.';
  if(review.version===2)return 'This version passed earlier automated source-support checks. It has not received the current checks against each note’s cited excerpts. Review important claims against the source.';
  return 'This version has not received the current automated source-support checks. Review important claims against the source.';
}
export function previousReviewPath(job, owner) {
  const path=sourceReview(job.artifacts).previousRevisionPath;
  return [2,3].some(version=>path===`${owner}/${job.id}/before-fidelity-v${version}.json`)?path:null;
}
