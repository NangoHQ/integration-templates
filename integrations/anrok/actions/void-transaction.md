<!-- BEGIN GENERATED CONTENT -->
# Void Transaction

## General Information

- **Description:** Voids a transaction in Anrok.
- **Version:** 1.0.0
- **Group:** Others
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Model:** `ActionOutput_anrok_voidtransaction`
- **Input Model:** `ActionInput_anrok_voidtransaction`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/anrok/actions/void-transaction.ts)


## Endpoint Reference

### Request Endpoint

`POST /transactions/void`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "0": {
    "id": "<string>"
  }
}
```

### Request Response

```json
{
  "succeeded": [
    {
      "id": "<string>"
    }
  ],
  "failed": [
    {
      "id": "<string>",
      "validation_errors?": "<unknown>"
    }
  ]
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/anrok/actions/void-transaction.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/anrok/actions/void-transaction.md)

<!-- END  GENERATED CONTENT -->

