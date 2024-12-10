# Background Check Parameters

## General Information

- **Description:** Fetch the parameters required to trigger a background check
- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: _None_
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/checkr-partner/actions/background-check-parameters.ts)

## Endpoint Reference

### Request Endpoint

- **Path:** `/background-check/service-parameters`
- **Method:** `GET`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "service_key": "<string>"
}
```

### Request Response

```json
{
  "parameters": [
    {
      "key": "<string>",
      "type": "<string>",
      "title": "<string>",
      "description": "<string>",
      "required": "<boolean>"
    }
  ]
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/checkr-partner/actions/background-check-parameters.ts)
-- [ReadMe History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/checkr-partner/actions/background-check-parameters.md)
