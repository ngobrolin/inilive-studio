-- Persist the YouTube liveBroadcast id associated with product Broadcast records.

ALTER TABLE broadcasts
  ADD COLUMN youtube_broadcast_id text;
