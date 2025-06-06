<!-- BEGIN GENERATED CONTENT -->
# Commit Transaction

## General Information

- **Description:** Marks a transaction by changing its status to Committed

- **Version:** 1.0.0
- **Group:** Transactions
- **Scopes:** `AccountAdmin, AccountOperator, AccountUser, BatchServiceAdmin, CompanyAdmin, CompanyUser, CSPTester, ProStoresOperator, SSTAdmin, TechnicalSupportAdmin`
- **Endpoint Type:** Action
- **Model:** `IdEntity`
- **Input Model:** `TransactionCode`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/avalara/actions/commit-transaction.ts)


## Endpoint Reference

### Request Endpoint

`PUT /transactions`

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

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/avalara/actions/commit-transaction.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/avalara/actions/commit-transaction.md)

<!-- END  GENERATED CONTENT -->

