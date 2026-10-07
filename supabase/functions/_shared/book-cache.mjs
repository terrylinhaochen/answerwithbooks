// Incomplete uploads must resume intake. Everything already saved keeps its
// progress, options, review state and artifacts; lookup never restarts a job.
export function reusableBook(job) {
 return !!job && (job.status !== 'uploaded' || job.run_state === 'queued');
}
export function cachedBookSummary(job) {
 return {id:job.id,title:job.title,status:job.status,run_state:job.run_state};
}
