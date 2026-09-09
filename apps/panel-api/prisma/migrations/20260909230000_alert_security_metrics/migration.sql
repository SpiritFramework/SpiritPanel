-- Expand alert metrics for account / server security watches.
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
  'server_subuser'
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
  'server_subuser'
) NOT NULL;
