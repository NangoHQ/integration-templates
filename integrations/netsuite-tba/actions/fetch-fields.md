<!-- BEGIN GENERATED CONTENT -->
# Fetch Fields

## General Information

- **Description:** Fetches all fields in Netsuite
- **Version:** 2.0.0
- **Group:** Fields
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Model:** `ActionOutput_netsuite_tba_fetchfields`
- **Input Model:** `ActionInput_netsuite_tba_fetchfields`
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
  "id?": "<string>",
  "schema?": "<string>",
  "title?": "<string>",
  "description?": "<string>",
  "type?": "<<string> | <string[]>>",
  "properties?": {},
  "required?": "<string[]>",
  "items?": "<{\"id?\":\"<string>\",\"schema?\":\"<string>\",\"title?\":\"<string>\",\"description?\":\"<string>\",\"type?\":\"<<string> | <string[]>>\",\"properties?\":{},\"required?\":\"<string[]>\",\"enum?\":\"<unknown[]>\",\"definitions?\":{},\"additionalProperties?\":\"<boolean>\",\"default?\":\"<unknown>\"} | [{\"id?\":\"<string>\",\"schema?\":\"<string>\",\"title?\":\"<string>\",\"description?\":\"<string>\",\"type?\":\"<<string> | <string[]>>\",\"properties?\":{},\"required?\":\"<string[]>\",\"enum?\":\"<unknown[]>\",\"definitions?\":{},\"additionalProperties?\":\"<boolean>\",\"default?\":\"<unknown>\"}]>",
  "enum?": "<unknown[]>",
  "definitions?": {},
  "additionalProperties?": "<<boolean> | {\"id?\":\"<string>\",\"schema?\":\"<string>\",\"title?\":\"<string>\",\"description?\":\"<string>\",\"type?\":\"<<string> | <string[]>>\",\"properties?\":{},\"required?\":\"<string[]>\",\"enum?\":\"<unknown[]>\",\"definitions?\":{},\"additionalProperties?\":\"<boolean>\",\"default?\":\"<unknown>\"}>",
  "default?": "<unknown>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/netsuite-tba/actions/fetch-fields.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/netsuite-tba/actions/fetch-fields.md)

<!-- END  GENERATED CONTENT -->

