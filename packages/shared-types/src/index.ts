export type UserRole = 'admin' | 'user';

export type ServerStatus =
  | 'installing'
  | 'install_failed'
  | 'suspended'
  | 'restoring_backup'
  | 'null';

export type InstallStatus = 'none' | 'installing' | 'installed' | 'failed';

export interface ServerLimits {
  memory: number;
  swap: number;
  disk: number;
  io: number;
  cpu: number;
}

export interface PterodactylEggExport {
  meta?: {
    version?: string;
    update_url?: string | null;
  };
  exported_at?: string;
  name: string;
  author?: string;
  description?: string;
  features?: string[] | null;
  docker_images?: Record<string, string>;
  file_denylist?: string[];
  startup: string;
  config: {
    files?: Record<string, unknown>;
    startup?: Record<string, unknown>;
    logs?: Record<string, unknown>;
    stop?: string;
  };
  scripts?: {
    installation?: {
      script?: string;
      container?: string;
      entrypoint?: string;
      privileged?: boolean;
    };
  };
  variables?: Array<{
    name: string;
    description?: string;
    env_variable: string;
    default_value: string;
    user_viewable?: boolean;
    user_editable?: boolean;
    rules?: string;
    field_type?: string;
  }>;
}

export const PTDL_V2 = 'PTDL_v2';

export interface WingsServerConfiguration {
  uuid: string;
  settings: {
    uuid: string;
    meta: {
      name: string;
      description: string;
    };
    suspended: boolean;
    environment: Record<string, string>;
    invocation: string;
    skip_egg_scripts: boolean;
    build: {
      memory_limit: number;
      swap: number;
      io_weight: number;
      cpu_limit: number;
      threads: string | null;
      disk_space: number;
      oom_disabled: boolean;
    };
    container: {
      image: string;
      oom_disabled: boolean;
      requires_rebuild: boolean;
    };
    allocations: {
      force_outgoing_ip: boolean;
      default: { ip: string; port: number };
      mappings: Record<string, number[]>;
    };
    mounts: unknown[];
    egg: {
      id: number;
      uuid: string;
      features: string[];
      file_denylist: string[];
    };
  };
  process_configuration: {
    startup: {
      done: string[];
      user_interaction: unknown[];
      strip_ansi: boolean;
    };
    stop: {
      type: string;
      value: string;
    };
  };
  container: {
    image: string;
    oom_disabled: boolean;
    requires_rebuild: boolean;
  };
}

export interface PanelSettings {
  panelName: string;
  logoUrl: string;
  accentColor: string;
  registrationEnabled: boolean;
  maintenanceMode: boolean;
}

export interface ApiResponse<T> {
  object: string;
  attributes: T;
}

export interface PaginatedResponse<T> {
  object: 'list';
  data: T[];
  meta: {
    pagination: {
      total: number;
      count: number;
      per_page: number;
      current_page: number;
      total_pages: number;
    };
  };
}
