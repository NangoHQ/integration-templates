<!-- BEGIN GENERATED CONTENT -->
# Subscriptions

## General Information

- **Description:** Fetches a list of subscriptions
- **Version:** 1.0.0
- **Group:** Subscriptions
- **Scopes:** `subscription_read`
- **Endpoint Type:** Sync
- **Model:** `Subscription`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/stripe-app/syncs/subscriptions.ts)


## Endpoint Reference

### Request Endpoint

`GET /subscriptions`

### Request Query Parameters

- **modified_after:** `(optional, string)` A timestamp (e.g., `2023-05-31T11:46:13.390Z`) used to fetch records modified after this date and time. If not provided, all records are returned. The modified_after parameter is less precise than cursor, as multiple records may share the same modification timestamp.
- **limit:** `(optional, integer)` The maximum number of records to return per page. Defaults to 100.
- **cursor:** `(optional, string)` A marker used to fetch records modified after a specific point in time.If not provided, all records are returned.Each record includes a cursor value found in _nango_metadata.cursor.Save the cursor from the last record retrieved to track your sync progress.Use the cursor parameter together with the limit parameter to paginate through records.The cursor is more precise than modified_after, as it can differentiate between records with the same modification timestamp.
- **filter:** `(optional, added | updated | deleted)` Filter to only show results that have been added or updated or deleted.
- **ids:** `(optional, string[])` An array of string containing a list of your records IDs. The list will be filtered to include only the records with a matching ID.

### Request Body

_No request body_

### Request Response

```json
{
  "id": "<string>",
  "automatic_tax": {
    "enabled": "<boolean>",
    "liability": "<boolean | string | null>",
    "disabled_reason": "<string | null>"
  },
  "billing_cycle_anchor": "<number>",
  "billing_thresholds": "<string | null>",
  "cancel_at": "<string | null>",
  "cancel_at_period_end": "<boolean>",
  "canceled_at": "<string | null>",
  "cancellation_details": {
    "comment": "<string | null>",
    "feedback": "<string | null>",
    "reason": "<string | null>"
  },
  "collection_method": "<string>",
  "created": "<number>",
  "currency": "<string>",
  "current_period_end": "<number>",
  "current_period_start": "<number>",
  "customer": "<string>",
  "days_until_due": "<number | null>",
  "default_payment_method": "<string | null>",
  "description": "<string | null>",
  "discount": "<string | null>",
  "discounts": "<<string[]> | <null>>",
  "ended_at": "<string | null>",
  "invoice_settings": {
    "issuer": {
      "type": "<string>"
    },
    "account_tax_ids": "<<null> | <string> | <string[]>>"
  },
  "items": [
    {
      "id": "<string>",
      "billing_thresholds": "<string | null>",
      "created": "<number>",
      "plan": {
        "id": "<string>",
        "object": "<string>",
        "active": "<boolean>",
        "aggregate_usage?": "<unknown>",
        "amount": "<number>",
        "amount_decimal": "<string>",
        "billing_scheme": "<string>",
        "created": "<number>",
        "currency": "<string>",
        "discounts?": "<unknown>",
        "interval": "<string>",
        "interval_count": "<number>",
        "livemode": "<boolean>",
        "nickname?": "<unknown>",
        "product": "<string>",
        "tiers_mode?": "<unknown>",
        "transform_usage?": "<unknown>",
        "trial_period_days?": "<unknown>",
        "usage_type": "<string>"
      },
      "price": {
        "id": "<string>",
        "object": "<string>",
        "active": "<boolean>",
        "billing_scheme": "<string>",
        "created": "<number>",
        "currency": "<string>",
        "custom_unit_amount?": "<unknown>",
        "livemode": "<boolean>",
        "lookup_key?": "<unknown>",
        "nickname?": "<unknown>",
        "product": "<string>",
        "recurring": {
          "aggregate_usage?": "<unknown>",
          "interval": "<string>",
          "interval_count": "<number>",
          "trial_period_days?": "<unknown>",
          "usage_type": "<string>"
        },
        "tax_behavior": "<string>",
        "tiers_mode?": "<unknown>",
        "transform_quantity?": "<unknown>",
        "type": "<string>",
        "unit_amount": "<number>",
        "unit_amount_decimal": "<string>"
      },
      "quantity": "<number>",
      "subscription": "<string>",
      "tax_rates": "<string[]>"
    }
  ],
  "latest_invoice": "<string>",
  "livemode": "<boolean>",
  "next_pending_invoice_item_invoice": "<string | null>",
  "on_behalf_of": "<string | null>",
  "pause_collection": "<string | null>",
  "payment_settings": {
    "payment_method_options": "<string | null>",
    "payment_method_types": "<string | null>",
    "save_default_payment_method": "<string>"
  },
  "pending_invoice_item_interval": "<string | null>",
  "pending_setup_intent": "<string | null>",
  "schedule": "<string | null>",
  "start_date": "<number>",
  "status": "<string>",
  "transfer_data": "<string | null>",
  "trial_end": "<string | null>",
  "trial_settings": {
    "end_behavior": {
      "missing_payment_method": "<string>"
    }
  },
  "trial_start": "<string | null>"
}
```

### Expected Metadata

```json
{}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/stripe-app/syncs/subscriptions.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/stripe-app/syncs/subscriptions.md)

<!-- END  GENERATED CONTENT -->

