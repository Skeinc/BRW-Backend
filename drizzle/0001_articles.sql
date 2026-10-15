ALTER TYPE "public"."slug_redirect_entity" ADD VALUE 'article';--> statement-breakpoint
CREATE TABLE "article" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(160) NOT NULL,
	"title" varchar(255) NOT NULL,
	"excerpt" varchar(500),
	"content" text NOT NULL,
	"image_key" text,
	"seo_title" varchar(120),
	"seo_description" varchar(320),
	"is_published" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "article_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE INDEX "article_is_published_idx" ON "article" USING btree ("is_published");--> statement-breakpoint
CREATE INDEX "article_published_at_idx" ON "article" USING btree ("published_at");