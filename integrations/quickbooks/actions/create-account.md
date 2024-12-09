# Create Account

## General Information

- **Description:** Creates a single account in QuickBooks.

- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: com.intuit.quickbooks.accounting
- **Endpoint Type:** Action
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/quickbooks-sandbox/actions/create-account.ts)

## Endpoint Reference

### Request Endpoint

- **Path:** /accounts
- **Method:** POST

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "name": "<string>",
  "account_type?": "<string>",
  "account_sub_type?": "<string>",
  "description?": "<string>",
  "acct_num?": "<string>"
}
```

### Request Response

```json
{
  "__extends": {
    "created_at": "<string>",
    "updated_at": "<string>"
  },
  "id": "<string>",
  "fully_qualified_name": "<string>",
  "name": "<string>",
  "account_type": "<string>",
  "account_sub_type": "<string>",
  "classification": "<string>",
  "current_balance_cents": "<number>",
  "active": "<boolean>",
  "description": "<string | null>",
  "acct_num": "<string | null>",
  "sub_account": "<boolean>"
}
```
