<!-- BEGIN GENERATED CONTENT -->
# Get Company Details

## General Information

- **Description:** Retrieves detailed information about the current company in Bitdefender GravityZone.
- **Version:** 1.0.0
- **Group:** Company
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Model:** `ActionOutput_bitdefender_getcompanydetails`
- **Input Model:** `ActionInput_bitdefender_getcompanydetails`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/bitdefender/actions/get-company-details.ts)


## Endpoint Reference

### Request Endpoint

`GET /company-details`

### Request Query Parameters

_No request parameters_

### Request Body

```json
"<null>"
```

### Request Response

```json
{
  "id": "<string>",
  "name": "<string>",
  "type": "<number>",
  "country?": "<string>",
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

