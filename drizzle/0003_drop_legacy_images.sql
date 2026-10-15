-- Pre-release cleanup: no environment holds real photos yet, so the legacy rows (product_image and the
-- image_key columns) are dropped without being copied into media_image. Their files stay on disk unreferenced.
DROP TABLE "product_image" CASCADE;--> statement-breakpoint
ALTER TABLE "article" DROP COLUMN "image_key";--> statement-breakpoint
ALTER TABLE "category" DROP COLUMN "image_key";--> statement-breakpoint
ALTER TABLE "collection" DROP COLUMN "image_key";