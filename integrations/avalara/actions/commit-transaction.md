# Commit Transaction

## General Information

- **Description:** Marks a transaction by changing its status to Committed

- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: AccountAdmin, AccountOperator, AccountUser, BatchServiceAdmin, CompanyAdmin, CompanyUser, CSPTester, ProStoresOperator, SSTAdmin, TechnicalSupportAdmin
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/avalara-sandbox/actions/commit-transaction.ts)

## Endpoint Reference

### Request Endpoint

- **Path:** `/transactions`
- **Method:** `PUT`

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
