import type { DatabricksWarehouse } from '../models.js';
import type { DatabricksWarehouseResponseItem } from '../types.js';

export function toWarehouse(warehouse: DatabricksWarehouseResponseItem): DatabricksWarehouse {
    return {
        id: warehouse.id,
        name: warehouse.name,
        cluster_size: warehouse.cluster_size,
        min_num_clusters: warehouse.min_num_clusters,
        max_num_clusters: warehouse.max_num_clusters,
        auto_stop_mins: warehouse.auto_stop_mins,
        creator_name: warehouse.creator_name,
        spot_instance_policy: warehouse.spot_instance_policy,
        enable_photon: warehouse.enable_photon,
        enable_serverless_compute: warehouse.enable_serverless_compute,
        channel: warehouse.channel,
        warehouse_type: warehouse.warehouse_type,
        num_active_sessions: warehouse.num_active_sessions,
        num_clusters: warehouse.num_clusters,
        state: warehouse.state,
        tags: warehouse.tags,
        health: {
            status: warehouse.health.status,
            message: warehouse.health.message
        }
    };
}
