<!-- BEGIN GENERATED CONTENT -->
# Upsert Customers

## General Information

- **Description:** Upsert a customer in Recharge
- **Version:** 0.0.1
- **Group:** Customers
- **Scopes:** `read_customers, write_customers, write_payment_methods`
- **Endpoint Type:** Action
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/recharge/actions/upsert-customers.ts)


## Endpoint Reference

### Request Endpoint

`POST /customers`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "email": "<string>",
  "external_customer_id?": "<ExternalCustomerId | undefined>",
  "first_name": "<string>",
  "last_name": "<string>",
  "phone?": "<string | undefined>",
  "tax_exempt?": "<boolean | undefined>"
}
```

### Request Response

```json
{
  "action": "<update | create>",
  "response": {
    "accepts_marketing": "<number | null>",
    "analytics_data": {
      "utm_params": {
        "0": {
          "utm_campaign?": "<string | undefined>",
          "utm_content?": "<string | undefined>",
          "utm_data_source?": "<string | undefined>",
          "utm_source?": "<string | undefined>",
          "utm_medium?": "<string | undefined>",
          "utm_term?": "<string | undefined>",
          "utm_timestamp?": "<string | undefined>"
        }
      }
    },
    "billing_address1": "<string | null>",
    "billing_address2": "<string | null>",
    "billing_city": "<string | null>",
    "billing_company": "<string | null>",
    "billing_country": "<string | null>",
    "billing_phone": "<string | null>",
    "billing_province": "<string | null>",
    "billing_zip": "<string | null>",
    "created_at": "<string>",
    "email": "<string>",
    "first_charge_processed_at": "<string | null>",
    "first_name": "<string>",
    "has_card_error_in_dunning": "<boolean>",
    "has_valid_payment_method": "<boolean>",
    "hash": "<string>",
    "id": "<number>",
    "last_name": "<string>",
    "number_active_subscriptions": "<number>",
    "number_subscriptions": "<number>",
    "phone": "<string | null>",
    "processor_type": "<string | null>",
    "reason_payment_method_not_valid": "<string | null>",
    "shopify_customer_id": "<string | null>",
    "status": "<string>",
    "tax_exempt": "<boolean>",
    "updated_at": "<string>",
    "apply_credit_to_next_recurring_charge?": "<boolean | undefined>",
    "external_customer_id?": "<ExternalCustomerId | undefined>",
    "has_payment_method_in_dunning?": "<boolean | undefined>",
    "subscriptions_active_count?": "<number | undefined>",
    "subscriptions_total_count?": "<number | undefined>",
    "subscription_related_charge_streak?": "<number | undefined>"
  }
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/recharge/actions/upsert-customers.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/recharge/actions/upsert-customers.md)

<!-- END  GENERATED CONTENT -->

