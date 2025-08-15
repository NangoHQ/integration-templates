<!-- BEGIN GENERATED CONTENT -->
# Update Account

## General Information

- **Description:** Updates a single account in QuickBooks.
- **Version:** 1.0.0
- **Group:** Accounts
- **Scopes:** `com.intuit.quickbooks.accounting`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_quickbooks_updateaccount`
- **Input Model:** `ActionInput_quickbooks_updateaccount`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/quickbooks/actions/update-account.ts)


## Endpoint Reference

### Request Endpoint

`PUT /accounts`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "name": "<string>",
  "account_type?": "<string>",
  "account_sub_type?": "<string>",
  "description?": "<string>",
  "acct_num?": "<string>",
  "id": "<string>",
  "sync_token": "<string>",
  "active?": "<boolean>"
}
```

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

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/quickbooks/actions/update-account.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/quickbooks/actions/update-account.md)

<!-- END  GENERATED CONTENT -->

