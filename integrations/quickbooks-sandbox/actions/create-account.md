<!-- BEGIN GENERATED CONTENT -->
# Create Account

## General Information

- **Description:** Creates a single account in QuickBooks.

- **Version:** 0.0.1
- **Group:** Accounts
- **Scopes:** `com.intuit.quickbooks.accounting`
- **Endpoint Type:** Action
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/quickbooks-sandbox/actions/create-account.ts)


## Endpoint Reference

### Request Endpoint

`POST /accounts`

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
  "created_at": "<string | null>",
  "updated_at": "<string>",
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

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/quickbooks-sandbox/actions/create-account.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/quickbooks-sandbox/actions/create-account.md)

<!-- END  GENERATED CONTENT -->

