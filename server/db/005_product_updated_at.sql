ALTER TABLE products ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
UPDATE products SET updated_at = created_at;
ALTER TABLE store_settings ADD COLUMN about_story varchar(2000) NOT NULL DEFAULT '';
ALTER TABLE store_settings ADD COLUMN about_service varchar(2000) NOT NULL DEFAULT '';
ALTER TABLE store_settings ADD COLUMN care_tips varchar(2000) NOT NULL DEFAULT '';
