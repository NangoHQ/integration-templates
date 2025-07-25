<!-- BEGIN GENERATED CONTENT -->
# Create Invoice

## General Information

- **Description:** Action to create an invoice in pennylane

- **Version:** 1.0.1
- **Group:** Invoices
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Model:** `PennylaneSuccessResponse`
- **Input Model:** `CreateInvoice`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/pennylane/actions/create-invoice.ts)


## Endpoint Reference

### Request Endpoint

`POST /invoices`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "create_customer?": "<boolean>",
  "create_products?": "<boolean>",
  "update_customer?": "<boolean>",
  "date": "<string>",
  "deadline": "<string>",
  "draft?": "<boolean>",
  "customer_source_id": "<string>",
  "external_id?": "<string | null>",
  "pdf_invoice_free_text?": "<string | null>",
  "pdf_invoice_subject?": "<string | null>",
  "currency?": "<string>",
  "special_mention?": "<string | null>",
  "discount?": "<number>",
  "language?": "<string>",
  "transactions_reference?": {
    "banking_provider": "<string | null>",
    "provider_field_name": "<string | null>",
    "provider_field_value": "<string | null>"
  },
  "line_items": [
    "<LineItemWithTax[] | LineItemWithoutTax[] | LineItemWithExistingProduct>"
  ],
  "categories?": [
    {
      "source_id": "<string>",
      "weight": "<number | null>",
      "amount": "<number | null>"
    }
  ],
  "line_items_sections_attributes?": [
    {
      "title?": "<string | null>",
      "description?": "<string | null>",
      "rank": "<number>"
    }
  ],
  "imputation_dates?": {
    "start_date": "<string>",
    "end_date": "<string>"
  }
}
```

### Request Response

```json
{
  "success": "<boolean>",
  "source_id": "<string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/pennylane/actions/create-invoice.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/pennylane/actions/create-invoice.md)

<!-- END  GENERATED CONTENT -->

