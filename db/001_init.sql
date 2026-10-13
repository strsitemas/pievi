CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS app_user (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL,
  email text NOT NULL UNIQUE, password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'ADMIN' CHECK (role IN ('ADMIN','EDITOR')),
  active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS category (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE, label text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS product (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), category_id uuid REFERENCES category(id) ON DELETE SET NULL,
  category_slug text NOT NULL, brand text NOT NULL, name text NOT NULL,
  sizes text[] NOT NULL DEFAULT '{}', status text NOT NULL DEFAULT 'disponivel' CHECK (status IN ('novo','disponivel','vendido','oculto')),
  color text NOT NULL DEFAULT '#26394d', image bytea, image_mime text,
  sort_order integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS product_public_idx ON product(status,sort_order,created_at);
CREATE TABLE IF NOT EXISTS site_setting (key text PRIMARY KEY, value text NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
INSERT INTO category(name,slug,label) VALUES ('Tênis','tenis','Tênis'),('Camisetas','camiseta','Camisetas'),('Bermudas','bermuda','Bermudas') ON CONFLICT(slug) DO NOTHING;
INSERT INTO site_setting(key,value) VALUES
 ('whatsapp_url','https://chat.whatsapp.com/JMhBTv12uEw6saKA88zveM?mode=wwt'),
 ('instagram_url','https://instagram.com/'),
 ('hero_title','A arte da exclusividade'),
 ('hero_description','Curadoria de peças de luxo e streetwear second hand.'),
 ('contact_text','Fale com a Pievi Club') ON CONFLICT(key) DO NOTHING;
INSERT INTO product(category_id,category_slug,brand,name,sizes,status,color,sort_order)
SELECT c.id,'tenis','Golden Goose','Superstar Low — Off White Star',ARRAY['41','42','43'],'novo','#26394d',1 FROM category c WHERE c.slug='tenis'
AND NOT EXISTS (SELECT 1 FROM product);
INSERT INTO product(category_id,category_slug,brand,name,sizes,status,color,sort_order)
SELECT c.id,'camiseta','Off-White','Tee Arrows — Black/White',ARRAY['M','L'],'disponivel','#141414',2 FROM category c WHERE c.slug='camiseta' AND (SELECT count(*) FROM product)=1;
INSERT INTO product(category_id,category_slug,brand,name,sizes,status,color,sort_order)
SELECT c.id,'tenis','CDG × Converse','Play Chuck 70 — Black Heart',ARRAY['40','41'],'novo','#2c4a63',3 FROM category c WHERE c.slug='tenis' AND (SELECT count(*) FROM product)=2;
INSERT INTO product(category_id,category_slug,brand,name,sizes,status,color,sort_order)
SELECT c.id,'tenis','Nike × Off-White','Dunk Low — Lot 49/50',ARRAY['42'],'disponivel','#1f5f7a',4 FROM category c WHERE c.slug='tenis' AND (SELECT count(*) FROM product)=3;
INSERT INTO product(category_id,category_slug,brand,name,sizes,status,color,sort_order)
SELECT c.id,'bermuda','Comme des Garçons','Shorts Red Print',ARRAY['M'],'disponivel','#a82f2f',5 FROM category c WHERE c.slug='bermuda' AND (SELECT count(*) FROM product)=4;
INSERT INTO product(category_id,category_slug,brand,name,sizes,status,color,sort_order)
SELECT c.id,'tenis','Golden Goose','Slide Sandal — White',ARRAY['41'],'vendido','#5d6b7a',6 FROM category c WHERE c.slug='tenis' AND (SELECT count(*) FROM product)=5;
