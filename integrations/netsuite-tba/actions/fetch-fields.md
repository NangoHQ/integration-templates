<!-- BEGIN GENERATED CONTENT -->
# Fetch Fields

## General Information

- **Description:** Fetches all fields in Netsuite

- **Version:** 1.0.1
- **Group:** Fields
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Model:** `FetchFieldsOutput`
- **Input Model:** `FetchFieldsInput`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/netsuite-tba/actions/fetch-fields.ts)


## Endpoint Reference

### Request Endpoint

`GET /fetch-fields`

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
  "id?": "<string | undefined>",
  "schema?": "<string | undefined>",
  "title?": "<string | undefined>",
  "description?": "<string | undefined>",
  "type?": "<string | string[] | undefined>",
  "properties?": "<object | undefined>",
  "required?": "<string[] | undefined>",
  "items?": "<FetchFieldsOutput | FetchFieldsOutput[] | undefined>",
  "enum?": "<any[] | undefined>",
  "definitions?": "<object | undefined>",
  "additionalProperties?": "<boolean | FetchFieldsOutput | undefined>",
  "default?": "<any | undefined>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/netsuite-tba/actions/fetch-fields.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/netsuite-tba/actions/fetch-fields.md)

<!-- END  GENERATED CONTENT -->

