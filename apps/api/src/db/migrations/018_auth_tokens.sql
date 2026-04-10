-- Password reset tokens and email change tokens

CREATE TABLE IF NOT EXISTS auth_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       TEXT NOT NULL UNIQUE,
  type        TEXT NOT NULL CHECK (type IN ('password_reset', 'email_change')),
  new_email   TEXT,           -- only used for email_change tokens
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS auth_tokens_token_idx ON auth_tokens(token);
CREATE INDEX IF NOT EXISTS auth_tokens_user_id_idx ON auth_tokens(user_id);
