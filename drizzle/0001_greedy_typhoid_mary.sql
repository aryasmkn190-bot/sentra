CREATE TABLE "batches" (
	"id" serial PRIMARY KEY NOT NULL,
	"batch_number" integer NOT NULL,
	"name" varchar(255),
	"start_at" timestamp NOT NULL,
	"end_at" timestamp NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "batches_batch_number_unique" UNIQUE("batch_number")
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "batch_id" integer;