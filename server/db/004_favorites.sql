CREATE TABLE product_favorites (
  product_id bigint NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  visitor_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (product_id, visitor_id)
);
ALTER TABLE store_settings ADD COLUMN tiktok varchar(300) NOT NULL DEFAULT '';
