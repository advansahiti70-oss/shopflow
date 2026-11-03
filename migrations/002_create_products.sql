-- 002: categories and products

CREATE TABLE categories (
  id           SERIAL PRIMARY KEY,
  slug         VARCHAR(80)  NOT NULL UNIQUE,
  name         VARCHAR(120) NOT NULL,
  description  TEXT,
  image_url    TEXT,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TRIGGER categories_set_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE products (
  id            SERIAL PRIMARY KEY,
  category_id   INTEGER      NOT NULL REFERENCES categories (id) ON DELETE RESTRICT,
  name          VARCHAR(160) NOT NULL,
  slug          VARCHAR(180) NOT NULL UNIQUE,
  description   TEXT         NOT NULL,
  -- Money is stored in cents to avoid floating point rounding errors.
  price_cents   INTEGER      NOT NULL,
  image_url     TEXT         NOT NULL,
  rating        NUMERIC(2,1) NOT NULL DEFAULT 0,
  review_count  INTEGER      NOT NULL DEFAULT 0,
  stock         INTEGER      NOT NULL DEFAULT 0,
  is_featured   BOOLEAN      NOT NULL DEFAULT FALSE,
  is_active     BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  CONSTRAINT products_price_check        CHECK (price_cents > 0),
  CONSTRAINT products_rating_check       CHECK (rating BETWEEN 0 AND 5),
  CONSTRAINT products_review_count_check CHECK (review_count >= 0),
  CONSTRAINT products_stock_check        CHECK (stock >= 0)
);

CREATE INDEX products_category_idx ON products (category_id);
CREATE INDEX products_price_idx    ON products (price_cents);
CREATE INDEX products_featured_idx ON products (is_featured) WHERE is_featured = TRUE;
CREATE INDEX products_name_lower_idx ON products (LOWER(name));

CREATE TRIGGER products_set_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
