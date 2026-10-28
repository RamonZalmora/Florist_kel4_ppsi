ALTER TABLE store_settings ADD COLUMN shopee varchar(300) NOT NULL DEFAULT '';
ALTER TABLE store_settings ADD COLUMN tokopedia varchar(300) NOT NULL DEFAULT '';
UPDATE store_settings SET whatsapp='6282380087007', instagram='https://share.google/PciYm0L1lPyb6IhXpc', shopee='https://shopee.co.id/bienvendreofficial', tokopedia='https://www.tokopedia.com/bienvendreofficialb?source=universe&st=product', updated_at=now() WHERE id=1;
