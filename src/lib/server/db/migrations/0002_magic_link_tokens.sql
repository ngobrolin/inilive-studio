CREATE TABLE magic_link_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_account_id uuid NOT NULL REFERENCES host_accounts(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX magic_link_tokens_host_account_id_idx ON magic_link_tokens (host_account_id);
