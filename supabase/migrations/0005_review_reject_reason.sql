-- Review moderation: reason taxonomy for rejected reviews.
-- DELIBERATELY omits any rating/sentiment-based reason. Moderation must never
-- depend on how positive a review is (FTC 16 CFR Part 465 + Google policy).
-- See COMPLIANCE.md. Additive + nullable: safe to apply to a live table.

do $$ begin
  create type review_reject_reason as enum
    ('spam', 'fake', 'abusive', 'off_topic', 'legal', 'other');
exception
  when duplicate_object then null;
end $$;

alter table reviews
  add column if not exists reject_reason review_reject_reason,  -- null unless rejected
  add column if not exists reject_note   text;                  -- optional internal note
