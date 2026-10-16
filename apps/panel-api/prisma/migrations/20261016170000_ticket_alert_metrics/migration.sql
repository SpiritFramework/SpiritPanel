-- Ticket support alerts for staff inboxes + optional ticket deep-link on events.
ALTER TABLE `alert_rules` MODIFY `metric` ENUM(
  'cpu',
  'memory',
  'disk',
  'node_offline',
  'server_offline',
  'server_crashed',
  'install_failed',
  'account_login_failed',
  'account_login',
  'account_password_changed',
  'account_2fa_changed',
  'account_api_key',
  'server_subuser',
  'ticket_opened',
  'ticket_user_reply'
) NOT NULL;

ALTER TABLE `alert_events` MODIFY `metric` ENUM(
  'cpu',
  'memory',
  'disk',
  'node_offline',
  'server_offline',
  'server_crashed',
  'install_failed',
  'account_login_failed',
  'account_login',
  'account_password_changed',
  'account_2fa_changed',
  'account_api_key',
  'server_subuser',
  'ticket_opened',
  'ticket_user_reply'
) NOT NULL;

ALTER TABLE `alert_events` ADD COLUMN `ticket_id` VARCHAR(191) NULL;
CREATE INDEX `alert_events_ticket_id_idx` ON `alert_events`(`ticket_id`);
ALTER TABLE `alert_events` ADD CONSTRAINT `alert_events_ticket_id_fkey` FOREIGN KEY (`ticket_id`) REFERENCES `support_tickets`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
