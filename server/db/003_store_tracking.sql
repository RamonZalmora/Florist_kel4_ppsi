CREATE TABLE store_settings (
  id integer PRIMARY KEY CHECK(id=1),
  name varchar(120) NOT NULL DEFAULT 'Bien Vendre',
  address varchar(500) NOT NULL DEFAULT '',
  whatsapp varchar(20) NOT NULL DEFAULT '',
  instagram varchar(300) NOT NULL DEFAULT '',
  description varchar(1500) NOT NULL DEFAULT '',
  logo text NOT NULL DEFAULT '/assets/logo.svg',
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE orders ADD COLUMN tracking_code varchar(32) NOT NULL DEFAULT replace(gen_random_uuid()::text,'-','');
CREATE UNIQUE INDEX orders_tracking_code ON orders(tracking_code);
