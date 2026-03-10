CREATE TABLE IF NOT EXISTS "categories" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" varchar(100) NOT NULL UNIQUE,
  "emoji" varchar(10) NOT NULL DEFAULT '📦',
  "sort_order" integer NOT NULL DEFAULT 0,
  "restricted" boolean NOT NULL DEFAULT false,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Seed default categories
INSERT INTO "categories" ("name", "emoji", "sort_order", "restricted") VALUES
  ('Rokok', '🚬', 1, false),
  ('Minuman', '🥛', 2, true),
  ('Makanan', '🍜', 3, false),
  ('Aksesoris', '🔥', 4, true),
  ('Lainnya', '📦', 99, false)
ON CONFLICT ("name") DO NOTHING;
