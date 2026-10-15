CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE TYPE "public"."delivery_method" AS ENUM('delivery', 'pickup');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('new', 'in_progress', 'done', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('cash_on_delivery', 'installment', 'bank_transfer');--> statement-breakpoint
CREATE TYPE "public"."slug_redirect_entity" AS ENUM('category', 'collection', 'product');--> statement-breakpoint
CREATE TYPE "public"."stock_status" AS ENUM('in_stock', 'on_order', 'out_of_stock');--> statement-breakpoint
CREATE SEQUENCE "public"."order_request_number_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE TABLE "category" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" uuid,
	"slug" varchar(120) NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"seo_title" varchar(120),
	"seo_description" varchar(320),
	"image_key" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "category_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "collection" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(120) NOT NULL,
	"name" varchar(120) NOT NULL,
	"description" text,
	"seo_title" varchar(120),
	"seo_description" varchar(320),
	"image_key" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "collection_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "order_request_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_request_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"sku" varchar(64),
	"unit_price" numeric(12, 2) NOT NULL,
	"qty" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_request" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" varchar(20) DEFAULT 'BRW-' || lpad(nextval('order_request_number_seq')::text, 6, '0') NOT NULL,
	"status" "order_status" DEFAULT 'new' NOT NULL,
	"contact_name" varchar(120) NOT NULL,
	"phone" varchar(32) NOT NULL,
	"email" varchar(255),
	"delivery_method" "delivery_method" NOT NULL,
	"city" varchar(120),
	"address" text,
	"payment_method" "payment_method" NOT NULL,
	"comment" text,
	"total" numeric(12, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "order_request_number_unique" UNIQUE("number")
);
--> statement-breakpoint
CREATE TABLE "product_image" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"key" text NOT NULL,
	"alt" varchar(255),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"collection_id" uuid,
	"slug" varchar(160) NOT NULL,
	"sku" varchar(64),
	"name" varchar(255) NOT NULL,
	"description" text,
	"price" numeric(12, 2) NOT NULL,
	"old_price" numeric(12, 2),
	"stock_status" "stock_status" DEFAULT 'in_stock' NOT NULL,
	"width_mm" integer,
	"height_mm" integer,
	"height_max_mm" integer,
	"depth_mm" integer,
	"length_mm" integer,
	"material" varchar(100),
	"color_body" varchar(100),
	"color_facade" varchar(100),
	"assembly_pdf_key" text,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"seo_title" varchar(120),
	"seo_description" varchar(320),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_slug_unique" UNIQUE("slug"),
	CONSTRAINT "product_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
CREATE TABLE "slug_redirect" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity" "slug_redirect_entity" NOT NULL,
	"old_slug" varchar(160) NOT NULL,
	"target_id" uuid NOT NULL,
	CONSTRAINT "slug_redirect_entity_old_slug_unique" UNIQUE("entity","old_slug")
);
--> statement-breakpoint
ALTER TABLE "category" ADD CONSTRAINT "category_parent_id_category_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."category"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_request_item" ADD CONSTRAINT "order_request_item_order_request_id_order_request_id_fk" FOREIGN KEY ("order_request_id") REFERENCES "public"."order_request"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_request_item" ADD CONSTRAINT "order_request_item_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_image" ADD CONSTRAINT "product_image_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_collection_id_collection_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collection"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "category_parent_id_idx" ON "category" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "order_request_item_order_request_id_idx" ON "order_request_item" USING btree ("order_request_id");--> statement-breakpoint
CREATE INDEX "order_request_status_idx" ON "order_request" USING btree ("status");--> statement-breakpoint
CREATE INDEX "order_request_created_at_idx" ON "order_request" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "product_image_product_id_idx" ON "product_image" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_category_id_idx" ON "product" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "product_collection_id_idx" ON "product" USING btree ("collection_id");--> statement-breakpoint
CREATE INDEX "product_price_idx" ON "product" USING btree ("price");--> statement-breakpoint
CREATE INDEX "product_is_published_idx" ON "product" USING btree ("is_published");--> statement-breakpoint
CREATE INDEX "product_name_trgm_idx" ON "product" USING gin ("name" gin_trgm_ops);