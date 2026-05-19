ALTER TABLE "invoices" ADD COLUMN "station_id" TEXT;

CREATE INDEX "invoices_station_id_idx" ON "invoices"("station_id");
