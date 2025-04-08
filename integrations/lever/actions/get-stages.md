<!-- BEGIN GENERATED CONTENT -->
# Get Stages

## General Information

- **Description:** Action to get lists all pipeline stages. Note that this does 
not paginate the response so it is possible that not all stages 
are returned.

- **Version:** 1.0.1
- **Group:** Stages
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/lever/actions/get-stages.ts)


## Endpoint Reference

### Request Endpoint

`GET /stages/limited`

### Request Query Parameters

_No request parameters_

### Request Body

_No request body_

### Request Response

```json
{
  "stages": [
    {
      "id": "<string>",
      "text": "<string>"
    }
  ]
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/lever/actions/get-stages.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/lever/actions/get-stages.md)

<!-- END  GENERATED CONTENT -->

