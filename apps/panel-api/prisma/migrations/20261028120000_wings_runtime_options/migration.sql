-- FeatherWings 1.4.3 panel-owned runtime options.
ALTER TABLE "nodes" ADD COLUMN "crash_detection_enabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "nodes" ADD COLUMN "check_install_exit_code" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "nodes" ADD COLUMN "cpu_shares" INTEGER NOT NULL DEFAULT 1024;

ALTER TABLE "servers" ADD COLUMN "crash_detection_enabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "servers" ADD COLUMN "auto_start_enabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "servers" ADD COLUMN "auto_start_manually_stopped" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "servers" ADD COLUMN "auto_start_delay" INTEGER NOT NULL DEFAULT 0;
