# Fetch Fields

## General Information

- **Description:** Fetch available task fields, child relationships and validation rules. If the input is not specified then it defaults back to "Task"
Data Validation: Parses all incoming data with Zod. Does not fail on parsing error will instead log parse error and return result.

- **Version:** 1.0.1
- **Group:** Others
- **Scopes:**: offline_access,api
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/salesforce-sandbox/actions/fetch-fields.ts)

## Endpoint Reference

### Request Endpoint

- **Path:** `/fields`
- **Method:** `GET`

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
  "__extends": {
    "fields": [
      {
        "name": "<string>",
        "label": "<string>",
        "type": "<string>",
        "referenceTo": [
          "<string>"
        ],
        "relationshipName": "<string | null>"
      }
    ]
  },
  "childRelationships": [
    {
      "object": "<string>",
      "relationshipName": "<string | null>",
      "field": "<string>"
    }
  ],
  "validationRules": [
    {
      "id": "<string>",
      "name": "<string>",
      "errorConditionFormula": "<string>",
      "errorMessage": "<string>"
    }
  ]
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/salesforce-sandbox/actions/fetch-fields.ts)
-- [ReadMe History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/salesforce-sandbox/actions/fetch-fields.md)
