CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE users (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  username varchar(64) NOT NULL UNIQUE,
  password_hash text NOT NULL,
  name varchar(120) NOT NULL,
  role varchar(10) NOT NULL CHECK (role IN ('admin', 'owner')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE sessions (
  token_hash char(64) PRIMARY KEY,
  user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  csrf_token varchar(64) NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE TABLE categories (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name varchar(100) NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  photo text NOT NULL DEFAULT '/assets/floral-hero.svg'
);
CREATE TABLE products (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name varchar(120) NOT NULL,
  price numeric(14,2) NOT NULL CHECK(price > 0),
  flower_type varchar(150) NOT NULL,
  size varchar(80) NOT NULL,
  description text NOT NULL,
  photo text NOT NULL DEFAULT '/assets/floral-hero.svg',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE recommendations (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  category_id bigint NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  product_id bigint NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  note varchar(300) NOT NULL DEFAULT '',
  UNIQUE(category_id, product_id)
);
CREATE TABLE orders (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  customer_name varchar(120) NOT NULL,
  phone_number varchar(24) NOT NULL,
  order_date date NOT NULL,
  delivery_date date NOT NULL,
  request text NOT NULL DEFAULT '',
  status varchar(15) NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','completed','cancelled')),
  total numeric(14,2) NOT NULL CHECK(total >= 0),
  created_by bigint NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK(delivery_date >= order_date)
);
CREATE TABLE order_items (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id bigint NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id bigint NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  product_name varchar(120) NOT NULL,
  quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 100),
  price numeric(14,2) NOT NULL CHECK(price > 0),
  subtotal numeric(14,2) GENERATED ALWAYS AS (quantity * price) STORED
);
CREATE TABLE sales (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id bigint NOT NULL UNIQUE REFERENCES orders(id) ON DELETE RESTRICT,
  sale_date date NOT NULL,
  total_sale numeric(14,2) NOT NULL CHECK(total_sale > 0)
);
CREATE INDEX orders_date_idx ON orders(order_date);
CREATE INDEX sales_date_idx ON sales(sale_date);
CREATE INDEX recommendations_product_idx ON recommendations(product_id);
CREATE INDEX sessions_expiry_idx ON sessions(expires_at);
