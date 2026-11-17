-- Existing accounts remain intact; their legacy sessions remain valid until the next sign-in.
ALTER TABLE users ADD COLUMN session_version TEXT;
