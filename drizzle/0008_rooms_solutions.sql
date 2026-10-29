ALTER TYPE "public"."media_entity_type" ADD VALUE 'room';--> statement-breakpoint
ALTER TYPE "public"."media_entity_type" ADD VALUE 'solution';--> statement-breakpoint
CREATE TABLE "room" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"description" text,
	"seo_title" varchar(120),
	"seo_description" varchar(320),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "solution_product" (
	"solution_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "solution_product_solution_id_product_id_pk" PRIMARY KEY("solution_id","product_id")
);
--> statement-breakpoint
CREATE TABLE "solution" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"collection_id" uuid NOT NULL,
	"name" varchar(160) NOT NULL,
	"description" text,
	"price" numeric(12, 2) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_published" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "solution_product" ADD CONSTRAINT "solution_product_solution_id_solution_id_fk" FOREIGN KEY ("solution_id") REFERENCES "public"."solution"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solution_product" ADD CONSTRAINT "solution_product_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solution" ADD CONSTRAINT "solution_room_id_room_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."room"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "solution" ADD CONSTRAINT "solution_collection_id_collection_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collection"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "solution_room_collection_idx" ON "solution" USING btree ("room_id","collection_id");