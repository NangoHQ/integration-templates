import { z } from "zod";

export const DatabricksWarehouse = z.object({
  id: z.string(),
  name: z.string(),
  cluster_size: z.string(),
  min_num_clusters: z.number(),
  max_num_clusters: z.number(),
  auto_stop_mins: z.number(),
  creator_name: z.string(),
  spot_instance_policy: z.string(),
  enable_photon: z.boolean(),
  enable_serverless_compute: z.boolean(),
  channel: z.string(),
  warehouse_type: z.string(),
  num_active_sessions: z.number(),
  num_clusters: z.number(),
  state: z.string(),
  tags: z.object({}),

  health: z.object({
    status: z.string(),
    message: z.string()
  })
});

export type DatabricksWarehouse = z.infer<typeof DatabricksWarehouse>;

export const ListWarehousesResponse = z.object({
  warehouses: DatabricksWarehouse.array()
});

export type ListWarehousesResponse = z.infer<typeof ListWarehousesResponse>;

export const models = {
  DatabricksWarehouse: DatabricksWarehouse,
  ListWarehousesResponse: ListWarehousesResponse
};