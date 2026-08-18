-- Performance indexes for hot query paths (server lists, schedules, activity)

CREATE INDEX `servers_owner_id_idx` ON `servers`(`owner_id`);
CREATE INDEX `servers_node_id_idx` ON `servers`(`node_id`);
CREATE INDEX `servers_status_idx` ON `servers`(`status`);
CREATE INDEX `servers_suspended_idx` ON `servers`(`suspended`);

CREATE INDEX `subusers_user_id_idx` ON `subusers`(`user_id`);

CREATE INDEX `schedules_is_active_idx` ON `schedules`(`is_active`);

CREATE INDEX `activity_logs_server_id_idx` ON `activity_logs`(`server_id`);
CREATE INDEX `activity_logs_actor_id_idx` ON `activity_logs`(`actor_id`);
