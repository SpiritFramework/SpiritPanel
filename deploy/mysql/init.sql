-- Spirit-Panel MySQL / MariaDB bootstrap
-- Usage: mysql -u root -p < deploy/mysql/init.sql

CREATE DATABASE IF NOT EXISTS spirit_panel CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'spirit_panel'@'localhost' IDENTIFIED BY 'CHANGE_ME_DB_PASSWORD';
CREATE USER IF NOT EXISTS 'spirit_panel'@'127.0.0.1' IDENTIFIED BY 'CHANGE_ME_DB_PASSWORD';

GRANT ALL PRIVILEGES ON spirit_panel.* TO 'spirit_panel'@'localhost';
GRANT ALL PRIVILEGES ON spirit_panel.* TO 'spirit_panel'@'127.0.0.1';

FLUSH PRIVILEGES;
