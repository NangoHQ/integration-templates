<!-- BEGIN GENERATED CONTENT -->
# Fetch Fields

## General Information

- **Description:** Introspection to retrieve available fields
- **Version:** 1.0.0
- **Group:** Others
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Model:** `BamboohrField[]`
- **Input Model:** _None_
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/bamboohr-basic/actions/fetch-fields.ts)


## Endpoint Reference

### Request Endpoint

`GET /fields`

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

