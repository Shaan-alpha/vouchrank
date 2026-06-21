-- Storage for video testimonials.
-- NOTE ON SCALE: Supabase Storage is fine for low volume, but raw video has
-- expensive egress and no transcoding/adaptive streaming. For production scale,
-- upload to Mux or Cloudflare Stream instead and store only the playback URL in
-- reviews.video_url. This bucket is the zero-extra-service default.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('review-videos', 'review-videos', true, 52428800, array['video/mp4','video/webm'])
on conflict (id) do nothing;

-- Public read (testimonials are shown on widgets / public sites).
create policy "review_videos_public_read"
  on storage.objects for select
  to anon, authenticated
  using ( bucket_id = 'review-videos' );

-- Uploads come through the funnel. Allow anon insert into this bucket only,
-- constrained to the video mime types enforced above. (Tighten to signed-upload
-- URLs issued by submit-review for stricter control.)
create policy "review_videos_anon_upload"
  on storage.objects for insert
  to anon, authenticated
  with check ( bucket_id = 'review-videos' );
