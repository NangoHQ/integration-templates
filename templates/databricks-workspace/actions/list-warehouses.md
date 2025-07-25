<!-- BEGIN GENERATED CONTENT -->
# List Warehouses

## General Information

- **Description:** List all SQL warehouses in the workspace
- **Version:** 1.0.0
- **Group:** Warehouses
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Model:** `ListWarehousesResponse`
- **Input Model:** _None_
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/databricks-workspace/actions/list-warehouses.ts)


## Endpoint Reference

### Request Endpoint

`GET /warehouses`

### Request Query Parameters

_No request parameters_

### Request Body

_No request body_

### Request Response

```json
{
  "warehouses": [
    {
      "id": "<string>",
      "name": "<string>",
      "cluster_size": "<string>",
      "min_num_clusters": "<number>",
      "max_num_clusters": "<number>",
      "auto_stop_mins": "<number>",
      "creator_name": "<string>",
      "spot_instance_policy": "<string>",
      "enable_photon": "<boolean>",
      "enable_serverless_compute": "<boolean>",
      "channel": "<string>",
      "warehouse_type": "<string>",
      "num_active_sessions": "<number>",
      "num_clusters": "<number>",
      "state": "<string>",
      "tags": "<object>",
      "health": {
        "status": "<string>",
        "message": "<string | undefined>"
      }
    }
  ]
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/databricks-workspace/actions/list-warehouses.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/databricks-workspace/actions/list-warehouses.md)

<!-- END  GENERATED CONTENT -->

