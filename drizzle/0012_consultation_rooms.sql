CREATE TABLE "room_collection" (
	"room_id" uuid NOT NULL,
	"collection_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "room_collection_room_id_collection_id_pk" PRIMARY KEY("room_id","collection_id")
);
--> statement-breakpoint
ALTER TABLE "collection" ADD COLUMN "price_from" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "room" ADD COLUMN "is_consultation_only" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "room_collection" ADD CONSTRAINT "room_collection_room_id_room_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."room"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "room_collection" ADD CONSTRAINT "room_collection_collection_id_collection_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collection"("id") ON DELETE cascade ON UPDATE no action;