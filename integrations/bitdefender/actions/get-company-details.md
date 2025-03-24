<!-- BEGIN GENERATED CONTENT -->
# Get Company Details

## General Information

- **Description:** Retrieves detailed information about the current company in Bitdefender GravityZone.

- **Version:** 1.0.0
- **Group:** Others
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/bitdefender/actions/get-company-details.ts)


## Endpoint Reference

### Request Endpoint

`POST /v1.0/jsonrpc/companies`

### Request Query Parameters

_No request parameters_

### Request Body

_No request body_

### Request Response

```json
{
  "id": "<string>",
  "name": "<string>",
  "type": "<number>",
  "country": "<string | undefined>",
  "createdAt": "<string>",
  "subscribedServices": {
    "endpoint": "<boolean>",
    "exchange": "<boolean>",
    "network": "<boolean>",
    "sos": "<boolean>"
  },
  "raw_json": "<string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/bitdefender/actions/get-company-details.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/bitdefender/actions/get-company-details.md)

<!-- END  GENERATED CONTENT -->

