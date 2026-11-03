-- 003: orders and order_items

CREATE TABLE orders (
  id                SERIAL PRIMARY KEY,
  order_number      VARCHAR(20)  NOT NULL UNIQUE,
  -- NULL for guest checkouts. Keeping the order when a user is deleted.
  user_id           INTEGER      REFERENCES users (id) ON DELETE SET NULL,
  customer_name     VARCHAR(120) NOT NULL,
  customer_email    VARCHAR(255) NOT NULL,
  shipping_address  VARCHAR(255) NOT NULL,
  shipping_city     VARCHAR(120) NOT NULL,
  shipping_postal_code VARCHAR(20) NOT NULL,
  shipping_country  VARCHAR(80)  NOT NULL,
  status            VARCHAR(20)  NOT NULL DEFAULT 'pending',
  subtotal_cents    INTEGER      NOT NULL,
  shipping_cents    INTEGER      NOT NULL DEFAULT 0,
  total_cents       INTEGER      NOT NULL,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT orders_status_check CHECK (
    status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')
  ),
  CONSTRAINT orders_amounts_check CHECK (
    subtotal_cents >= 0 AND shipping_cents >= 0 AND total_cents = subtotal_cents + shipping_cents
  )
);

CREATE INDEX orders_user_idx       ON orders (user_id);
CREATE INDEX orders_status_idx     ON orders (status);
CREATE INDEX orders_created_at_idx ON orders (created_at DESC);
CREATE INDEX orders_email_lower_idx ON orders (LOWER(customer_email));

CREATE TRIGGER orders_set_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Each line copies the product name and unit price at the moment of purchase,
-- so later price changes never alter historical orders.
CREATE TABLE order_items (
  id                SERIAL PRIMARY KEY,
  order_id          INTEGER      NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  product_id        INTEGER      REFERENCES products (id) ON DELETE SET NULL,
  product_name      VARCHAR(160) NOT NULL,
  product_image_url TEXT,
  unit_price_cents  INTEGER      NOT NULL,
  quantity          INTEGER      NOT NULL,
  line_total_cents  INTEGER      NOT NULL,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT order_items_quantity_check CHECK (quantity > 0),
  CONSTRAINT order_items_price_check    CHECK (unit_price_cents > 0),
  CONSTRAINT order_items_total_check    CHECK (line_total_cents = unit_price_cents * quantity)
);

CREATE INDEX order_items_order_idx   ON order_items (order_id);
CREATE INDEX order_items_product_idx ON order_items (product_id);
