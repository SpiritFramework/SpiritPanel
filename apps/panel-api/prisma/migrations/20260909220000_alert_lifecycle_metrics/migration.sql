-- Expand alert metric enum with lifecycle events
ALTER TABLE `alert_rules` MODIFY `metric` ENUM('cpu', 'memory', 'disk', 'node_offline', 'server_offline', 'server_crashed', 'install_failed') NOT NULL;
ALTER TABLE `alert_events` MODIFY `metric` ENUM('cpu', 'memory', 'disk', 'node_offline', 'server_offline', 'server_crashed', 'install_failed') NOT NULL;
