-- Add the resubmission lifecycle state before migrations reference it.
--
-- This statement intentionally lives in its own migration file. PostgreSQL
-- does not allow a newly added enum value to be used safely until the
-- transaction that added it has committed.
alter type public.application_status add value if not exists 'resubmitted';
