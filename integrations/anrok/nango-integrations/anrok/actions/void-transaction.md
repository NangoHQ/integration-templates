<!-- BEGIN GENERATED CONTENT -->
# Void Transaction

## General Information

- **Description:** Voids a transaction in Anrok.

- **Version:** 0.0.1
- **Group:** Others
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/anrok/actions/void-transaction.ts)


## Endpoint Reference

### Request Endpoint

`POST /transactions/void`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "input": [
    {
      "id": "<string>"
    }
  ]
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
      "validation_errors": "<any>"
    }
  ]
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/anrok/actions/void-transaction.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/anrok/actions/void-transaction.md)

<!-- END  GENERATED CONTENT -->

