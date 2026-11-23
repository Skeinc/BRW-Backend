-- Every room now lists its collections in room_collection, not only consultation-only rooms.
-- Links each existing (room, collection) pair of solutions, after the links the room already has, in the order the
-- storefront showed them: by the first solution of each collection.
INSERT INTO "room_collection" ("room_id", "collection_id", "sort_order")
SELECT
	"pairs"."room_id",
	"pairs"."collection_id",
	COALESCE((SELECT max("linked"."sort_order") FROM "room_collection" AS "linked" WHERE "linked"."room_id" = "pairs"."room_id"), -1)
		+ row_number() OVER (PARTITION BY "pairs"."room_id" ORDER BY "pairs"."first_order", "pairs"."first_name", "pairs"."collection_id")
FROM (
	SELECT "solution"."room_id", "solution"."collection_id", min("solution"."sort_order") AS "first_order", min("solution"."name") AS "first_name"
	FROM "solution"
	WHERE NOT EXISTS (
		SELECT 1 FROM "room_collection" AS "existing"
		WHERE "existing"."room_id" = "solution"."room_id" AND "existing"."collection_id" = "solution"."collection_id"
	)
	GROUP BY "solution"."room_id", "solution"."collection_id"
) AS "pairs";
