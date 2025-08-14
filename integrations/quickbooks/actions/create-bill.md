<!-- BEGIN GENERATED CONTENT -->
# Create Bill

## General Information

- **Description:** Creates a single bill in QuickBooks.
- **Version:** 1.0.0
- **Group:** Bills
- **Scopes:** `com.intuit.quickbooks.accounting`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_quickbooks_createbill`
- **Input Model:** `ActionInput_quickbooks_createbill`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/quickbooks/actions/create-bill.ts)


## Endpoint Reference

### Request Endpoint

`POST /bills`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "currency": "<string>",
  "vendor_id": "<string>",
  "vendor_name?": "<string>",
  "line": [
    {
      "id": "<string>",
      "detail_type": "<string>",
      "amount": "<number>",
      "account_id?": "<string>",
      "account_name?": "<string>"
    }
  ]
}
```

### Request Response

```json
{
  "created_at": "<string>",
  "updated_at": "<string>",
  "id": "<string>",
  "sales_term_id?": "<string>",
  "due_date": "<string>",
  "balance": "<number>",
  "txn_date": "<string>",
  "currency": "<string>",
  "vendor_id": "<string>",
  "vendor_name?": "<string>",
  "ap_account_id?": "<string>",
  "ap_account_name?": "<string>",
  "total_amount": "<number>",
  "lines": [
    {
      "id": "<string>",
      "detail_type": "<string>",
      "amount": "<number>",
      "account_id?": "<string>",
      "account_name?": "<string>"
    }
  ]
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/quickbooks/actions/create-bill.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/quickbooks/actions/create-bill.md)

<!-- END  GENERATED CONTENT -->

