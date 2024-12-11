# Invoices

## General Information

- **Description:** Fetches a list of customer invoices from pennylane

- **Version:** 1.0.0
- **Group:** Others
- **Scopes:** `customer_invoices`
- **Endpoint Type:** Sync
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/pennylane/syncs/invoices.ts)


## Endpoint Reference

### Request Endpoint

`GET /invoices`

### Request Query Parameters

- **modified_after:** `(optional, string)` A timestamp (e.g., `2023-05-31T11:46:13.390Z`) used to fetch records modified after this date and time. If not provided, all records are returned. The modified_after parameter is less precise than cursor, as multiple records may share the same modification timestamp.
- **limit:** `(optional, integer)` The maximum number of records to return per page. Defaults to 100.
- **cursor:** `(optional, string)` A marker used to fetch records modified after a specific point in time.If not provided, all records are returned.Each record includes a cursor value found in _nango_metadata.cursor.Save the cursor from the last record retrieved to track your sync progress.Use the cursor parameter together with the limit parameter to paginate through records.The cursor is more precise than modified_after, as it can differentiate between records with the same modification timestamp.
- **filter:** `(optional, added | updated | deleted)` Filter to only show results that have been added or updated or deleted.

### Request Body

_No request body_

### Request Response

```json
{
  "id": "<string>",
  "amount": "<string | null>",
  "billing_subscription?": "<BillingSubscriptionObject | null>",
  "categories?": "<InvoiceCategory[] | null>",
  "currency": "<string | null>",
  "currency_amount": "<string | null>",
  "currency_amount_before_tax?": "<string | null>",
  "currency_tax": "<string | null>",
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
  "customer_name": "<string>",
  "customer_validation_needed": "<boolean | null>",
  "date?": "<date | string>",
  "deadline": "<string | null>",
  "discount": "<string | null>",
  "discount_type?": "<string | null>",
  "exchange_rate": "<number | null>",
  "file_url": "<string | null>",
  "filename": "<string | null>",
  "fully_paid_at?": "<date | null>",
  "imputation_dates": "<ImputationDateObject | null>",
  "invoice_number?": "<string | null>",
  "is_draft": "<boolean>",
  "is_estimate?": "<boolean>",
  "label?": "<string | null>",
  "language?": "<string | null>",
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
  "line_items_sections_attributes?": [
    {
      "title?": "<string | null>",
      "description?": "<string | null>",
      "rank": "<number>"
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
  "paid": "<boolean>",
  "payments": [
    "<object>"
  ],
  "pdf_invoice_free_text": "<string>",
  "pdf_invoice_subject": "<string>",
  "public_url": "<string | null>",
  "quote_group_uuid?": "<string | null>",
  "remaining_amount": "<string | null>",
  "source": "<string | null>",
  "special_mention": "<string | null>",
  "status": "<string | null>",
  "transactions_reference?": "<TransactionReferenceObject | null>",
  "updated_at": "<date | string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/pennylane/syncs/invoices.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/pennylane/syncs/invoices.md)

<!-- END  GENERATED CONTENT -->

