-- Add countdown timing for product-backed Broadcast records.

ALTER TABLE broadcasts
  ADD COLUMN countdown_ends_at timestamptz;
