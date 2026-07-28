-- Share links may now point at a PDF.
--
-- 0008 only allowed the picture formats, because a share was made by uploading
-- an exported image. A render can be shared directly now, and a print-ready PDF
-- is a perfectly ordinary thing to hand someone.

alter table shares drop constraint shares_storage_key_check;

alter table shares
  add constraint shares_storage_key_check
  check (storage_key ~ '^[0-9a-f]{64}\.(jpg|png|webp|pdf)$');
