-- Add performance indexes for allocation queries
CREATE INDEX `allocations_node_id_assigned_idx` ON `allocations`(`node_id`, `assigned`);
CREATE INDEX `allocations_server_id_idx` ON `allocations`(`server_id`);
CREATE INDEX `allocations_node_id_ip_idx` ON `allocations`(`node_id`, `ip`);
CREATE INDEX `allocations_created_at_idx` ON `allocations`(`created_at`);
