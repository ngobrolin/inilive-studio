CREATE TABLE youtube_oauth_states (
  state text PRIMARY KEY,
  host_account_id uuid NOT NULL REFERENCES host_accounts(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE youtube_channel_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_account_id uuid NOT NULL REFERENCES host_accounts(id) ON DELETE CASCADE,
  youtube_channel_id text NOT NULL,
  youtube_channel_title text NOT NULL,
  refresh_token_ciphertext text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (host_account_id),
  UNIQUE (youtube_channel_id)
);
