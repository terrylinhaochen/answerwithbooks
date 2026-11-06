-- Global storage fileSizeLimit must also be set to 524288000 through the management API.
update storage.buckets set file_size_limit=524288000 where id='private-books';
