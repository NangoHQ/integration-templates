# Void Transaction

## General Information

- **Description:** Voids the current transaction uniquely identified by the transactionCode

- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: AccountAdmin, AccountOperator, BatchServiceAdmin, CompanyAdmin, CSPTester, ProStoresOperator, SSTAdmin, TechnicalSupportAdmin
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/avalara-sandbox/actions/void-transaction.ts)

## Endpoint Reference

### Request Endpoint

- **Path:** `/transactions`
- **Method:** `DELETE`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "transactionCode": "<string>"
}
```

### Request Response

```json
{
  "id": "<string>"
}
```
