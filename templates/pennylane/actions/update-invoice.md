<!-- BEGIN GENERATED CONTENT -->
# Update Invoice

## General Information

- **Description:** Action to update an invoice in pennylane

- **Version:** 1.0.1
- **Group:** Invoices
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Model:** `PennylaneSuccessResponse`
- **Input Model:** `UpdateInvoice`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/pennylane/actions/update-invoice.ts)


## Endpoint Reference

### Request Endpoint

`PATCH /invoices`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "id": "<string>",
  "label?": "<string | null>",
  "invoice_number?": "<string | null>",
  "quote_group_uuid?": "<string>",
  "is_draft?": "<boolean>",
  "is_estimate?": "<boolean>",
  "currency?": "<string>",
  "amount?": "<string>",
  "currency_amount?": "<string>",
  "currency_amount_before_tax?": "<string>",
  "exchange_rate?": "<number>",
  "date?": "<string | null>",
  "deadline?": "<string | null>",
  "currency_tax?": "<string>",
  "language?": "<string>",
  "paid?": "<boolean>",
  "fully_paid_at?": "<string | null>",
  "status?": "<string | null>",
  "discount?": "<string>",
  "discount_type?": "<string>",
  "public_url?": "<string>",
  "file_url?": "<string | null>",
  "filename?": "<string>",
  "remaining_amount?": "<string>",
  "source?": "<InvoiceSource>",
  "special_mention?": "<string | null>",
  "updated_at?": "<string>",
  "imputation_dates?": "<ImputationDateObject | null>",
  "customer?": {
    "customer_type?": "<string>",
    "first_name": "<string>",
    "last_name": "<string>",
    "country_alpha2": "<string>",
    "gender?": "<string | null>",
    "address?": "<string>",
    "postal_code?": "<string>",
    "city?": "<string>",
    "source_id?": "<string>",
    "emails?": [
      "<string>"
    ],
    "billing_iban?": "<string>",
    "delivery_address?": "<string | DeliveryAddressObject>",
    "vat_number?": "<string | null>",
    "delivery_postal_code?": "<string>",
    "delivery_city?": "<string>",
    "delivery_country_alpha2?": "<string>",
    "payment_conditions?": "<string>",
    "phone?": "<string>",
    "reference?": "<string>",
    "notes?": "<string>",
    "mandate?": {
      "provider?": "<string>",
      "source_id": "<string>"
    },
    "plan_item?": {
      "number?": "<string>",
      "label?": "<string>",
      "enabled?": "<boolean>",
      "vat_rate?": "<string>",
      "country_alpha2?": "<string>",
      "description?": "<string>"
    }
  },
  "line_items_sections_attributes?": [
    {
      "title?": "<string | null>",
      "description?": "<string | null>",
      "rank": "<number>"
    }
  ],
  "line_items?": [
    {
      "id?": "<number>",
      "label?": "<string>",
      "unit?": "<string | null>",
      "quantity?": "<string>",
      "amount?": "<string>",
      "currency_amount?": "<string>",
      "description?": "<string>",
      "product_id?": "<string | null>",
      "vat_rate?": "<string>",
      "currency_price_before_tax?": "<string>",
      "currency_tax?": "<string>",
      "raw_currency_unit_price?": "<string>",
      "discount?": "<string>",
      "discount_type?": "<string>",
      "section_rank?": "<number | null>",
      "v2_id?": "<number | null>",
      "product_v2_id?": "<number | null>"
    }
  ],
  "categories?": [
    {
      "source_id": "<string>",
      "weight": "<string>",
      "label": "<string>",
      "direction": "<string | null>",
      "created_at": "<date | string>",
      "updated_at": "<date | string>"
    }
  ],
  "transactions_reference?": {
    "banking_provider": "<string | null>",
    "provider_field_name": "<string | null>",
    "provider_field_value": "<string | null>"
  },
  "payments?": [
    {
      "label": "<string>",
      "created_at": "<date | string>",
      "currency_amount": "<string>"
    }
  ],
  "matched_transactions?": [
    {
      "label": "<string | null>",
      "amount": "<string | null>",
      "group_uuid": "<string | null>",
      "date": "<date | null>",
      "fee": "<string | null>",
      "currency": "<string>"
    }
  ],
  "pdf_invoice_free_text?": "<string>",
  "pdf_invoice_subject?": "<string>",
  "billing_subscription?": "<BillingSubscriptionObject | null>"
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

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/pennylane/actions/update-invoice.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/pennylane/actions/update-invoice.md)

<!-- END  GENERATED CONTENT -->

