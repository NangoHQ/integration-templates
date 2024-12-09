# Negate Transaction

## General Information

- **Description:** Creates a negation in Anrok.

- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: _None_
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/anrok/actions/negate-transaction.ts)

## Endpoint Reference

### Request Endpoint

- **Path:** /transactions/negate
- **Method:** POST

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "input": [
    {
      "id": "<string>",
      "voided_id": "<string>"
    }
  ]
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
      "__extends": {
        "id": "<string>",
        "voided_id": "<string>"
      },
      "validation_errors": "<any>"
    }
  ]
}
```
