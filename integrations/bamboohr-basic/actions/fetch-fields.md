<!-- BEGIN GENERATED CONTENT -->
# Fetch Fields

## General Information

- **Description:** Introspection to retrieve available fields
- **Version:** 2.0.0
- **Group:** Others
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Model:** `ActionOutput_bamboohr_basic_fetchfields`
- **Input Model:** `ActionInput_bamboohr_basic_fetchfields`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/bamboohr-basic/actions/fetch-fields.ts)


## Endpoint Reference

### Request Endpoint

`GET /fields`

### Request Query Parameters

_No request parameters_

### Request Body

```json
"<null>"
```

### Request Response

```json
{
  "0": {
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
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/bamboohr-basic/actions/fetch-fields.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/bamboohr-basic/actions/fetch-fields.md)

<!-- END  GENERATED CONTENT -->

