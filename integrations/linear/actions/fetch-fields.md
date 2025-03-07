<!-- BEGIN GENERATED CONTENT -->
# Fetch Fields

## General Information

- **Description:** Introspection endpoint to fetch the fields available per a model
- **Version:** 0.0.1
- **Group:** Fields
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/linear/actions/fetch-fields.ts)


## Endpoint Reference

### Request Endpoint

`GET /fields`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "name": "<string>"
}
```

### Request Response

```json
{
  "fields": [
    {
      "__string": "<Field | string>"
    }
  ]
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/linear/actions/fetch-fields.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/linear/actions/fetch-fields.md)

<!-- END  GENERATED CONTENT -->

