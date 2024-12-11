# Fetch Fields

## General Information

- **Description:** Introspection to retrieve available fields
- **Version:** 0.0.1
- **Group:** Others
- **Scopes:** `undefined`
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/bamboohr-basic/actions/fetch-fields.ts)


## Endpoint Reference

### Request Endpoint

- **Path:** `/fields`
- **Method:** `GET`

### Request Query Parameters

_No request parameters_

### Request Body

_No request body_

### Request Response

```json
[
  {
    "id": "<string>",
    "type": "<string>",
    "name": "<string>",
    "alias?": "<string>",
    "options?": [
      {
        "id": "<number>",
        "name": "<string>"
      }
    ]
  }
]
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/bamboohr-basic/actions/fetch-fields.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/bamboohr-basic/actions/fetch-fields.md)

<!-- END  GENERATED CONTENT -->

