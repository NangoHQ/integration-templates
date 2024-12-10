# Accounts

## General Information
- **Description:** Fetches all accounts in QuickBooks. Handles both active and archived accounts, saving or deleting them based on their status.

- **Version:** 0.0.1
- **Group:** Others
- **Scopes:**: com.intuit.quickbooks.accounting
- **Endpoint Type:** sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/quickbooks-sandbox/syncs/accounts.ts)

### Request Endpoint

- **Path:** `/accounts`
- **Method:** `GET`

### Request Query Parameters

_No request parameters_

### Request Body

_No request body_

### Request Response

```json
{
  "created_at": "<string>",
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


- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/quickbooks-sandbox/syncs/accounts.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/quickbooks-sandbox/syncs/accounts.md)

<!-- END  GENERATED CONTENT -->



undefined