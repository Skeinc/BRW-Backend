ALTER TYPE "public"."media_entity_type" ADD VALUE 'news';--> statement-breakpoint
ALTER TYPE "public"."slug_redirect_entity" ADD VALUE 'news';--> statement-breakpoint
CREATE TABLE "news" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(160) NOT NULL,
	"title" varchar(255) NOT NULL,
	"excerpt" varchar(500),
	"content" text NOT NULL,
	"seo_title" varchar(120),
	"seo_description" varchar(320),
	"is_published" boolean DEFAULT false NOT NULL,
	"is_promo" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "news_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE INDEX "news_is_published_idx" ON "news" USING btree ("is_published");--> statement-breakpoint
CREATE INDEX "news_published_at_idx" ON "news" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "news_is_promo_idx" ON "news" USING btree ("is_promo");