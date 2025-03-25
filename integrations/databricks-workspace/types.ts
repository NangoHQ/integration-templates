export interface DatabricksWarehouseResponse {
    warehouses: DatabricksWarehouseResponseItem[];
}

export interface DatabricksWarehouseResponseItem {
    id: string;
    name: string;
    cluster_size: string;
    min_num_clusters: number;
    max_num_clusters: number;
    auto_stop_mins: number;
    creator_name: string;
    spot_instance_policy: string;
    enable_photon: boolean;
    enable_serverless_compute: boolean;
    channel: string;
    warehouse_type: string;
    num_active_sessions: number;
    num_clusters: number;
    state: string;
    tags: Record<string, string>;
    health: {
        status: string;
        message?: string;
    };
    odbc_params: Record<string, string>;
    jdbc_params: Record<string, string>;
}
