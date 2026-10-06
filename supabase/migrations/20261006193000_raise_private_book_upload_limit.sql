-- Match the browser and worker limit. Keep sources private and preserve policies.
update storage.buckets
set file_size_limit = 52428800
where id = 'private-books';
