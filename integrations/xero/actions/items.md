# Items

## General Information
- **Description:** Fetches all items in Xero. Incremental sync, does not detect deletes, metadata is not
required.

- **Version:** 1.0.2
- **Group:** Others
- **Scopes:**: accounting.settings
- **Endpoint Type:** sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/xero/syncs/items.ts)

### Request Endpoint

- **Path:** `/items`
- **Method:** `GET`

### Request Query Parameters

_No request parameters_

### Request Body

_No request body_

### Request Response

```json
{
  "id": "<string>",
  "item_code": "<string | null>",
  "name": "<string>",
  "description": "<string | null>",
  "account_code": "<string | null>"
}
```

## Changelog


- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/xero/syncs/items.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/xero/syncs/items.md)

<!-- END  GENERATED CONTENT -->

undefined