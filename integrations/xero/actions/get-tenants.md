<!-- BEGIN GENERATED CONTENT -->
# Get Tenants

## General Information

- **Description:** Fetches all the tenants the connection has access to.
This can be used to set the metadata to the selected tenant.

- **Version:** 0.0.1
- **Group:** Others
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/xero/actions/get-tenants.ts)


## Endpoint Reference

### Request Endpoint

`GET /tenants`

### Request Query Parameters

_No request parameters_

### Request Body

_No request body_

### Request Response

```json
{
  "tenants": [
    {
      "id": "<string>",
      "authEventId": "<string>",
      "tenantId": "<string>",
      "tenantType": "<string>",
      "tenantName": "<string>",
      "createdDateUtc": "<string>",
      "updatedDateUtc": "<string>"
    }
  ]
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/xero/actions/get-tenants.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/xero/actions/get-tenants.md)

<!-- END  GENERATED CONTENT -->

