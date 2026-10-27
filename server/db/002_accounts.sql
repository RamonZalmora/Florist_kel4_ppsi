ALTER TABLE users ADD COLUMN email varchar(254) UNIQUE;
ALTER TABLE users ADD COLUMN email_verified boolean NOT NULL DEFAULT false;
CREATE TABLE account_tokens (
  token_hash char(64) PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose varchar(10) NOT NULL CHECK(purpose IN ('reset','verify')),
  email varchar(254) NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE INDEX account_tokens_expiry ON account_tokens(expires_at);
