<!-- BEGIN GENERATED CONTENT -->
# Void Transaction

## General Information

- **Description:** Voids the current transaction uniquely identified by the transactionCode
- **Version:** 2.0.0
- **Group:** Transactions
- **Scopes:** `AccountAdmin,  AccountOperator,  BatchServiceAdmin,  CompanyAdmin,  CSPTester,  ProStoresOperator,  SSTAdmin,  TechnicalSupportAdmin`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_avalara_voidtransaction`
- **Input Model:** `ActionInput_avalara_voidtransaction`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/avalara/actions/void-transaction.ts)


## Endpoint Reference

### Request Endpoint

`DELETE /transactions`

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

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/avalara/actions/void-transaction.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/avalara/actions/void-transaction.md)

<!-- END  GENERATED CONTENT -->

