<!-- BEGIN GENERATED CONTENT -->
# Get Company Details

## General Information

- **Description:** Retrieves detailed information about the current company in Bitdefender GravityZone.

- **Version:** 0.0.1
- **Group:** Company
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/bitdefender/actions/get-company-details.ts)


## Endpoint Reference

### Request Endpoint

`GET /company-details`

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
  "subscribedServices": {
    "endpoint": "<boolean>",
    "exchange": "<boolean>",
    "network": "<boolean>",
    "sos": "<boolean>"
  }
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/bitdefender/actions/get-company-details.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/bitdefender/actions/get-company-details.md)

<!-- END  GENERATED CONTENT -->

