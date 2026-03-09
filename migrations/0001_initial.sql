-- CreateTable
CREATE TABLE "users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "external_id" TEXT,
    "uuid" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name_first" TEXT,
    "name_last" TEXT,
    "password" TEXT NOT NULL,
    "remember_token" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en',
    "root_admin" BOOLEAN NOT NULL DEFAULT false,
    "use_totp" BOOLEAN NOT NULL DEFAULT false,
    "totp_secret" TEXT,
    "totp_authenticated_at" DATETIME,
    "gravatar" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "servers" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "external_id" TEXT,
    "uuid" TEXT NOT NULL,
    "uuidShort" TEXT NOT NULL,
    "node_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "status" TEXT,
    "skip_scripts" BOOLEAN NOT NULL DEFAULT false,
    "owner_id" INTEGER NOT NULL,
    "memory" INTEGER NOT NULL DEFAULT 0,
    "overhead_memory" INTEGER NOT NULL DEFAULT 0,
    "swap" INTEGER NOT NULL DEFAULT 0,
    "disk" INTEGER NOT NULL DEFAULT 0,
    "io" INTEGER NOT NULL DEFAULT 500,
    "cpu" INTEGER NOT NULL DEFAULT 0,
    "threads" TEXT,
    "oom_disabled" BOOLEAN NOT NULL DEFAULT true,
    "exclude_from_resource_calculation" BOOLEAN NOT NULL DEFAULT false,
    "allocation_id" INTEGER NOT NULL,
    "nest_id" INTEGER NOT NULL,
    "egg_id" INTEGER NOT NULL,
    "startup" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "allocation_limit" INTEGER,
    "database_limit" INTEGER,
    "backup_limit" INTEGER,
    "backup_storage_limit" INTEGER,
    "installed_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "servers_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "servers_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "nodes" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "servers_nest_id_fkey" FOREIGN KEY ("nest_id") REFERENCES "nests" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "servers_egg_id_fkey" FOREIGN KEY ("egg_id") REFERENCES "eggs" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "servers_allocation_id_fkey" FOREIGN KEY ("allocation_id") REFERENCES "allocations" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "nodes" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "uuid" TEXT NOT NULL,
    "public" BOOLEAN NOT NULL DEFAULT true,
    "trust_alias" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "location_id" INTEGER NOT NULL,
    "fqdn" TEXT NOT NULL,
    "internal_fqdn" TEXT,
    "use_separate_fqdns" BOOLEAN NOT NULL DEFAULT false,
    "scheme" TEXT NOT NULL DEFAULT 'https',
    "behind_proxy" BOOLEAN NOT NULL DEFAULT false,
    "maintenance_mode" BOOLEAN NOT NULL DEFAULT false,
    "memory" INTEGER NOT NULL,
    "memory_overallocate" INTEGER NOT NULL DEFAULT 0,
    "disk" INTEGER NOT NULL,
    "disk_overallocate" INTEGER NOT NULL DEFAULT 0,
    "upload_size" INTEGER NOT NULL DEFAULT 100,
    "daemon_token_id" TEXT NOT NULL,
    "daemon_token" TEXT NOT NULL,
    "daemonListen" INTEGER NOT NULL DEFAULT 8080,
    "daemonSFTP" INTEGER NOT NULL DEFAULT 2022,
    "daemonBase" TEXT NOT NULL DEFAULT '/var/lib/pterodactyl/volumes',
    "daemonType" TEXT NOT NULL DEFAULT 'elytra',
    "backupDisk" TEXT NOT NULL DEFAULT 'wings',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "nodes_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "allocations" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "node_id" INTEGER NOT NULL,
    "ip" TEXT NOT NULL,
    "ip_alias" TEXT,
    "port" INTEGER NOT NULL,
    "server_id" INTEGER,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "allocations_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "nodes" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "allocations_server_id_fkey" FOREIGN KEY ("server_id") REFERENCES "servers" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "locations" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "short" TEXT NOT NULL,
    "long" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "nests" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "uuid" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "eggs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "uuid" TEXT NOT NULL,
    "nest_id" INTEGER NOT NULL,
    "author" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "features" JSONB,
    "docker_images" JSONB NOT NULL,
    "file_denylist" JSONB,
    "update_url" TEXT,
    "force_outgoing_ip" BOOLEAN NOT NULL DEFAULT false,
    "startup" TEXT,
    "config_from" INTEGER,
    "config_stop" TEXT,
    "config_logs" TEXT,
    "config_startup" TEXT,
    "config_files" TEXT,
    "copy_script_from" INTEGER,
    "script_container" TEXT NOT NULL DEFAULT 'alpine:3.4',
    "script_entry" TEXT NOT NULL DEFAULT 'ash',
    "script_install" TEXT,
    "script_is_privileged" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "eggs_nest_id_fkey" FOREIGN KEY ("nest_id") REFERENCES "nests" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "eggs_config_from_fkey" FOREIGN KEY ("config_from") REFERENCES "eggs" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "eggs_copy_script_from_fkey" FOREIGN KEY ("copy_script_from") REFERENCES "eggs" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "egg_variables" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "egg_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "env_variable" TEXT NOT NULL,
    "default_value" TEXT NOT NULL DEFAULT '',
    "user_viewable" BOOLEAN NOT NULL DEFAULT false,
    "user_editable" BOOLEAN NOT NULL DEFAULT false,
    "rules" TEXT NOT NULL,
    "sort" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "egg_variables_egg_id_fkey" FOREIGN KEY ("egg_id") REFERENCES "eggs" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "server_variables" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "server_id" INTEGER NOT NULL,
    "variable_id" INTEGER NOT NULL,
    "variable_value" TEXT NOT NULL DEFAULT '',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "server_variables_server_id_fkey" FOREIGN KEY ("server_id") REFERENCES "servers" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "server_variables_variable_id_fkey" FOREIGN KEY ("variable_id") REFERENCES "egg_variables" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "schedules" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "server_id" INTEGER NOT NULL,
    "name" TEXT,
    "cron_day_of_week" TEXT NOT NULL DEFAULT '*',
    "cron_month" TEXT NOT NULL DEFAULT '*',
    "cron_day_of_month" TEXT NOT NULL DEFAULT '*',
    "cron_hour" TEXT NOT NULL DEFAULT '*',
    "cron_minute" TEXT NOT NULL DEFAULT '*',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_processing" BOOLEAN NOT NULL DEFAULT false,
    "only_when_online" BOOLEAN NOT NULL DEFAULT false,
    "last_run_at" DATETIME,
    "next_run_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "schedules_server_id_fkey" FOREIGN KEY ("server_id") REFERENCES "servers" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "schedule_id" INTEGER NOT NULL,
    "sequence_id" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "payload" TEXT NOT NULL DEFAULT '',
    "time_offset" INTEGER NOT NULL DEFAULT 0,
    "is_queued" BOOLEAN NOT NULL DEFAULT false,
    "is_processing" BOOLEAN NOT NULL DEFAULT false,
    "continue_on_failure" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "tasks_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "schedules" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "databases" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "server_id" INTEGER NOT NULL,
    "database_host_id" INTEGER NOT NULL,
    "database" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "remote" TEXT NOT NULL DEFAULT '%',
    "password" TEXT NOT NULL,
    "max_connections" INTEGER DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "databases_server_id_fkey" FOREIGN KEY ("server_id") REFERENCES "servers" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "databases_database_host_id_fkey" FOREIGN KEY ("database_host_id") REFERENCES "database_hosts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "database_hosts" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "host" TEXT NOT NULL,
    "port" INTEGER NOT NULL DEFAULT 3306,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "max_databases" INTEGER,
    "node_id" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "database_hosts_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "nodes" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "subusers" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "server_id" INTEGER NOT NULL,
    "permissions" JSONB NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "subusers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "subusers_server_id_fkey" FOREIGN KEY ("server_id") REFERENCES "servers" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "backups" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "server_id" INTEGER NOT NULL,
    "uuid" TEXT NOT NULL,
    "is_successful" BOOLEAN NOT NULL DEFAULT false,
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "is_automatic" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT NOT NULL,
    "ignored_files" JSONB NOT NULL,
    "server_state" JSONB,
    "disk" TEXT NOT NULL,
    "checksum" TEXT,
    "bytes" BIGINT NOT NULL DEFAULT 0,
    "upload_id" TEXT,
    "snapshot_id" TEXT,
    "completed_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "deleted_at" DATETIME,
    CONSTRAINT "backups_server_id_fkey" FOREIGN KEY ("server_id") REFERENCES "servers" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "server_transfers" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "server_id" INTEGER NOT NULL,
    "successful" BOOLEAN,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "old_node" INTEGER NOT NULL,
    "new_node" INTEGER NOT NULL,
    "old_allocation" INTEGER NOT NULL,
    "new_allocation" INTEGER NOT NULL,
    "old_additional_allocations" JSONB,
    "new_additional_allocations" JSONB,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "server_transfers_server_id_fkey" FOREIGN KEY ("server_id") REFERENCES "servers" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" BIGINT NOT NULL PRIMARY KEY,
    "batch" TEXT,
    "event" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "description" TEXT,
    "actor_type" TEXT,
    "actor_id" BIGINT,
    "api_key_id" INTEGER,
    "properties" JSONB,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "activity_log_subjects" (
    "id" BIGINT NOT NULL PRIMARY KEY,
    "activity_log_id" BIGINT NOT NULL,
    "subject_type" TEXT NOT NULL,
    "subject_id" BIGINT NOT NULL,
    CONSTRAINT "activity_log_subjects_activity_log_id_fkey" FOREIGN KEY ("activity_log_id") REFERENCES "activity_logs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" BIGINT NOT NULL PRIMARY KEY,
    "uuid" TEXT NOT NULL,
    "user_id" INTEGER,
    "server_id" INTEGER,
    "action" TEXT NOT NULL,
    "subaction" TEXT,
    "device" JSONB NOT NULL,
    "metadata" JSONB NOT NULL,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "audit_logs_server_id_fkey" FOREIGN KEY ("server_id") REFERENCES "servers" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "key_type" INTEGER NOT NULL DEFAULT 0,
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "allowed_ips" JSONB,
    "memo" TEXT,
    "last_used_at" DATETIME,
    "expires_at" DATETIME,
    "r_servers" INTEGER NOT NULL DEFAULT 0,
    "r_nodes" INTEGER NOT NULL DEFAULT 0,
    "r_allocations" INTEGER NOT NULL DEFAULT 0,
    "r_users" INTEGER NOT NULL DEFAULT 0,
    "r_locations" INTEGER NOT NULL DEFAULT 0,
    "r_nests" INTEGER NOT NULL DEFAULT 0,
    "r_eggs" INTEGER NOT NULL DEFAULT 0,
    "r_database_hosts" INTEGER NOT NULL DEFAULT 0,
    "r_server_databases" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "api_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "settings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" INTEGER,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "payload" TEXT NOT NULL,
    "last_activity" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "user_ssh_keys" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "public_key" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "deleted_at" DATETIME,
    CONSTRAINT "user_ssh_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "recovery_tokens" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "recovery_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "mounts" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "uuid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "source" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "read_only" BOOLEAN NOT NULL DEFAULT false,
    "user_mountable" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "mount_node" (
    "node_id" INTEGER NOT NULL,
    "mount_id" INTEGER NOT NULL,

    PRIMARY KEY ("node_id", "mount_id"),
    CONSTRAINT "mount_node_node_id_fkey" FOREIGN KEY ("node_id") REFERENCES "nodes" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "mount_node_mount_id_fkey" FOREIGN KEY ("mount_id") REFERENCES "mounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "mount_server" (
    "server_id" INTEGER NOT NULL,
    "mount_id" INTEGER NOT NULL,

    PRIMARY KEY ("server_id", "mount_id"),
    CONSTRAINT "mount_server_server_id_fkey" FOREIGN KEY ("server_id") REFERENCES "servers" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "mount_server_mount_id_fkey" FOREIGN KEY ("mount_id") REFERENCES "mounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "egg_mount" (
    "egg_id" INTEGER NOT NULL,
    "mount_id" INTEGER NOT NULL,

    PRIMARY KEY ("egg_id", "mount_id"),
    CONSTRAINT "egg_mount_egg_id_fkey" FOREIGN KEY ("egg_id") REFERENCES "eggs" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "egg_mount_mount_id_fkey" FOREIGN KEY ("mount_id") REFERENCES "mounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "subuser_id" INTEGER NOT NULL,
    "permission" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "domains" (
    "id" BIGINT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "dns_provider" TEXT NOT NULL,
    "dns_config" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "server_subdomains" (
    "id" BIGINT NOT NULL PRIMARY KEY,
    "server_id" INTEGER NOT NULL,
    "domain_id" BIGINT NOT NULL,
    "subdomain" TEXT NOT NULL,
    "record_type" TEXT NOT NULL,
    "dns_records" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "server_subdomains_server_id_fkey" FOREIGN KEY ("server_id") REFERENCES "servers" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "server_subdomains_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "domains" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "elytra_jobs" (
    "id" BIGINT NOT NULL PRIMARY KEY,
    "uuid" TEXT NOT NULL,
    "server_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "job_type" TEXT NOT NULL,
    "job_data" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "status_message" TEXT,
    "error_message" TEXT,
    "elytra_job_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submitted_at" DATETIME,
    "completed_at" DATETIME,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "elytra_jobs_server_id_fkey" FOREIGN KEY ("server_id") REFERENCES "servers" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "elytra_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "server_operations" (
    "id" BIGINT NOT NULL PRIMARY KEY,
    "operation_id" TEXT NOT NULL,
    "server_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "message" TEXT,
    "parameters" JSONB,
    "started_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "server_operations_server_id_fkey" FOREIGN KEY ("server_id") REFERENCES "servers" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "server_operations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "tasks_log" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "task_id" INTEGER NOT NULL,
    "run_status" INTEGER NOT NULL DEFAULT 0,
    "run_time" DATETIME,
    "response" TEXT NOT NULL DEFAULT '',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "notifiable_type" TEXT NOT NULL,
    "notifiable_id" BIGINT NOT NULL,
    "data" JSONB NOT NULL,
    "read_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "password_resets" (
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "created_at" DATETIME,

    PRIMARY KEY ("email", "token")
);

-- CreateTable
CREATE TABLE "failed_jobs" (
    "id" BIGINT NOT NULL PRIMARY KEY,
    "uuid" TEXT NOT NULL,
    "connection" TEXT NOT NULL,
    "queue" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "exception" TEXT NOT NULL,
    "failed_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" BIGINT NOT NULL PRIMARY KEY,
    "queue" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "reserved_at" INTEGER,
    "available_at" INTEGER NOT NULL,
    "created_at" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "api_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "authorized" BOOLEAN NOT NULL DEFAULT false,
    "error" TEXT,
    "key" TEXT,
    "method" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "content" TEXT,
    "user_agent" TEXT NOT NULL,
    "request_ip" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "users_external_id_key" ON "users"("external_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_uuid_key" ON "users"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "servers_external_id_key" ON "servers"("external_id");

-- CreateIndex
CREATE UNIQUE INDEX "servers_uuid_key" ON "servers"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "servers_uuidShort_key" ON "servers"("uuidShort");

-- CreateIndex
CREATE UNIQUE INDEX "servers_allocation_id_key" ON "servers"("allocation_id");

-- CreateIndex
CREATE INDEX "servers_node_id_foreign" ON "servers"("node_id");

-- CreateIndex
CREATE INDEX "servers_owner_id_foreign" ON "servers"("owner_id");

-- CreateIndex
CREATE INDEX "servers_nest_id_foreign" ON "servers"("nest_id");

-- CreateIndex
CREATE INDEX "servers_egg_id_foreign" ON "servers"("egg_id");

-- CreateIndex
CREATE UNIQUE INDEX "nodes_uuid_key" ON "nodes"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "nodes_daemon_token_id_key" ON "nodes"("daemon_token_id");

-- CreateIndex
CREATE INDEX "nodes_location_id_foreign" ON "nodes"("location_id");

-- CreateIndex
CREATE INDEX "allocations_node_id_foreign" ON "allocations"("node_id");

-- CreateIndex
CREATE INDEX "allocations_server_id_foreign" ON "allocations"("server_id");

-- CreateIndex
CREATE UNIQUE INDEX "locations_short_key" ON "locations"("short");

-- CreateIndex
CREATE UNIQUE INDEX "nests_uuid_key" ON "nests"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "eggs_uuid_key" ON "eggs"("uuid");

-- CreateIndex
CREATE INDEX "eggs_nest_id_foreign" ON "eggs"("nest_id");

-- CreateIndex
CREATE INDEX "eggs_config_from_foreign" ON "eggs"("config_from");

-- CreateIndex
CREATE INDEX "eggs_copy_script_from_foreign" ON "eggs"("copy_script_from");

-- CreateIndex
CREATE INDEX "egg_variables_egg_id_foreign" ON "egg_variables"("egg_id");

-- CreateIndex
CREATE INDEX "server_variables_server_id_foreign" ON "server_variables"("server_id");

-- CreateIndex
CREATE INDEX "server_variables_variable_id_foreign" ON "server_variables"("variable_id");

-- CreateIndex
CREATE UNIQUE INDEX "server_variables_server_id_variable_id_key" ON "server_variables"("server_id", "variable_id");

-- CreateIndex
CREATE INDEX "schedules_server_id_foreign" ON "schedules"("server_id");

-- CreateIndex
CREATE INDEX "tasks_schedule_id_foreign" ON "tasks"("schedule_id");

-- CreateIndex
CREATE INDEX "databases_server_id_foreign" ON "databases"("server_id");

-- CreateIndex
CREATE INDEX "databases_database_host_id_foreign" ON "databases"("database_host_id");

-- CreateIndex
CREATE INDEX "database_hosts_node_id_foreign" ON "database_hosts"("node_id");

-- CreateIndex
CREATE INDEX "subusers_server_id_foreign" ON "subusers"("server_id");

-- CreateIndex
CREATE UNIQUE INDEX "subusers_user_id_server_id_key" ON "subusers"("user_id", "server_id");

-- CreateIndex
CREATE UNIQUE INDEX "backups_uuid_key" ON "backups"("uuid");

-- CreateIndex
CREATE INDEX "backups_server_id_foreign" ON "backups"("server_id");

-- CreateIndex
CREATE INDEX "server_transfers_server_id_foreign" ON "server_transfers"("server_id");

-- CreateIndex
CREATE INDEX "activity_logs_event_index" ON "activity_logs"("event");

-- CreateIndex
CREATE INDEX "activity_logs_actor_type_actor_id_index" ON "activity_logs"("actor_type", "actor_id");

-- CreateIndex
CREATE INDEX "activity_log_subjects_activity_log_id_foreign" ON "activity_log_subjects"("activity_log_id");

-- CreateIndex
CREATE INDEX "activity_log_subjects_subject_type_subject_id_index" ON "activity_log_subjects"("subject_type", "subject_id");

-- CreateIndex
CREATE UNIQUE INDEX "audit_logs_uuid_key" ON "audit_logs"("uuid");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_foreign" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_server_id_foreign" ON "audit_logs"("server_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_identifier_key" ON "api_keys"("identifier");

-- CreateIndex
CREATE INDEX "api_keys_user_id_foreign" ON "api_keys"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "settings_key_key" ON "settings"("key");

-- CreateIndex
CREATE INDEX "sessions_user_id_index" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_last_activity_index" ON "sessions"("last_activity");

-- CreateIndex
CREATE INDEX "user_ssh_keys_user_id_foreign" ON "user_ssh_keys"("user_id");

-- CreateIndex
CREATE INDEX "recovery_tokens_user_id_foreign" ON "recovery_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "mounts_uuid_key" ON "mounts"("uuid");

-- CreateIndex
CREATE UNIQUE INDEX "mounts_name_key" ON "mounts"("name");

-- CreateIndex
CREATE INDEX "permissions_subuser_id_foreign" ON "permissions"("subuser_id");

-- CreateIndex
CREATE UNIQUE INDEX "domains_name_key" ON "domains"("name");

-- CreateIndex
CREATE INDEX "domains_is_active_idx" ON "domains"("is_active");

-- CreateIndex
CREATE INDEX "domains_is_default_idx" ON "domains"("is_default");

-- CreateIndex
CREATE INDEX "server_subdomains_server_id_index" ON "server_subdomains"("server_id");

-- CreateIndex
CREATE INDEX "server_subdomains_is_active_idx" ON "server_subdomains"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "server_subdomains_domain_id_subdomain_key" ON "server_subdomains"("domain_id", "subdomain");

-- CreateIndex
CREATE UNIQUE INDEX "elytra_jobs_uuid_key" ON "elytra_jobs"("uuid");

-- CreateIndex
CREATE INDEX "elytra_jobs_server_id_status_index" ON "elytra_jobs"("server_id", "status");

-- CreateIndex
CREATE INDEX "elytra_jobs_server_id_job_type_index" ON "elytra_jobs"("server_id", "job_type");

-- CreateIndex
CREATE INDEX "elytra_jobs_elytra_job_id_index" ON "elytra_jobs"("elytra_job_id");

-- CreateIndex
CREATE INDEX "elytra_jobs_status_created_at_index" ON "elytra_jobs"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "server_operations_operation_id_key" ON "server_operations"("operation_id");

-- CreateIndex
CREATE INDEX "server_operations_server_status_created" ON "server_operations"("server_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "server_operations_type_status_created" ON "server_operations"("type", "status", "created_at");

-- CreateIndex
CREATE INDEX "server_operations_status_created" ON "server_operations"("status", "created_at");

-- CreateIndex
CREATE INDEX "server_operations_server_status" ON "server_operations"("server_id", "status");

-- CreateIndex
CREATE INDEX "server_operations_status_started" ON "server_operations"("status", "started_at");

-- CreateIndex
CREATE INDEX "tasks_log_task_id_index" ON "tasks_log"("task_id");

-- CreateIndex
CREATE INDEX "notifications_notifiable_type_notifiable_id_index" ON "notifications"("notifiable_type", "notifiable_id");

-- CreateIndex
CREATE INDEX "password_resets_email_index" ON "password_resets"("email");

-- CreateIndex
CREATE UNIQUE INDEX "failed_jobs_uuid_key" ON "failed_jobs"("uuid");

-- CreateIndex
CREATE INDEX "jobs_queue_index" ON "jobs"("queue");

