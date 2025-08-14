<!-- BEGIN GENERATED CONTENT -->
# Negate Transaction

## General Information

- **Description:** Creates a negation in Anrok.
- **Version:** 1.0.0
- **Group:** Others
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Model:** `ActionOutput_anrok_negatetransaction`
- **Input Model:** `ActionInput_anrok_negatetransaction`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/anrok/actions/negate-transaction.ts)


## Endpoint Reference

### Request Endpoint

`POST /transactions/negate`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "0": {
    "id": "<string>",
    "voided_id": "<string>"
  }
}
```

### Request Response

```json
{
  "succeeded": [
    {
      "id": "<string>",
      "voided_id": "<string>"
    }
  ],
  "failed": [
    {
      "id": "<string>",
      "voided_id": "<string>",
      "validation_errors?": "<unknown>"
    }
  ]
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/anrok/actions/negate-transaction.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/anrok/actions/negate-transaction.md)

<!-- END  GENERATED CONTENT -->

