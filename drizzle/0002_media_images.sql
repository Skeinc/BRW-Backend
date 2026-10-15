CREATE TYPE "public"."media_entity_type" AS ENUM('product', 'category', 'collection', 'article');--> statement-breakpoint
CREATE TABLE "media_image" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" "media_entity_type" NOT NULL,
	"entity_id" uuid NOT NULL,
	"key" text NOT NULL,
	"alt" varchar(255),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_image_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE INDEX "media_image_owner_idx" ON "media_image" USING btree ("entity_type","entity_id","sort_order");