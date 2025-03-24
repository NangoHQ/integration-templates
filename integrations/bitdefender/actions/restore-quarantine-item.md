<!-- BEGIN GENERATED CONTENT -->
# Restore Quarantine Item

## General Information

- **Description:** Restores a quarantined file in Bitdefender GravityZone.

- **Version:** 0.0.1
- **Group:** Others
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/bitdefender/actions/restore-quarantine-item.ts)


## Endpoint Reference

### Request Endpoint

`POST /v1.0/jsonrpc/quarantine`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "id": "<string>"
}
```

### Request Response

```json
{
  "success": "<boolean>",
  "message": "<string | undefined>",
  "raw_json": "<string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/bitdefender/actions/restore-quarantine-item.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/bitdefender/actions/restore-quarantine-item.md)

<!-- END  GENERATED CONTENT -->

