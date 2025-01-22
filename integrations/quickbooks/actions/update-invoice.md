<!-- BEGIN GENERATED CONTENT -->
# Update Invoice

## General Information

- **Description:** Updates a single invoice in QuickBooks.

- **Version:** 0.0.1
- **Group:** Invoices
- **Scopes:** `com.intuit.quickbooks.accounting`
- **Endpoint Type:** Action
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/quickbooks/actions/update-invoice.ts)


## Endpoint Reference

### Request Endpoint

`PUT /invoices`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{}
```

### Request Response

```json
{
  "id": "<string>",
  "txn_date?": "<string>",
  "balance_cents?": "<number>",
  "total_amt_cents?": "<number>",
  "bill_address?": "<BillAddr | null>",
  "items?": [
    {
      "id": "<string>",
      "description": "<string | null>",
      "qty": "<number>",
      "unit_price_cents": "<number>",
      "amount_cents": "<number>"
    }
  ],
  "due_date": "<string>",
  "deposit_cents": "<number>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/quickbooks/actions/update-invoice.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/quickbooks/actions/update-invoice.md)

<!-- END  GENERATED CONTENT -->

