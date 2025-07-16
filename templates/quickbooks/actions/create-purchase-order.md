<!-- BEGIN GENERATED CONTENT -->
# Create Purchase Order

## General Information

- **Description:** Creates a single purchase order in QuickBooks.

- **Version:** 0.0.1
- **Group:** Purchase Orders
- **Scopes:** `com.intuit.quickbooks.accounting`
- **Endpoint Type:** Action
- **Model:** `PurchaseOrder`
- **Input Model:** `CreatePurchaseOrder`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/quickbooks/actions/create-purchase-order.ts)


## Endpoint Reference

### Request Endpoint

`POST /purchase-orders`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "ap_account_ref": {
    "name?": "<string>",
    "value": "<string>"
  },
  "vendor_ref": {
    "name?": "<string>",
    "value": "<string>"
  },
  "line": [
    {
      "id?": "<string>",
      "amount_cents": "<number>",
      "detail_type": "<ItemBasedExpenseLineDetail>",
      "item_based_expense_line_detail?": {
        "item_ref?": {
          "name?": "<string>",
          "value": "<string>"
        },
        "price_level_ref?": {
          "name?": "<string>",
          "value": "<string>"
        },
        "qty?": "<number>",
        "unit_price_cents?": "<number>",
        "tax_inclusive_amt?": "<number>",
        "customer_ref?": {
          "name?": "<string>",
          "value": "<string>"
        },
        "class_ref?": {
          "name?": "<string>",
          "value": "<string>"
        },
        "tax_code_ref?": {
          "name?": "<string>",
          "value": "<string>"
        },
        "markup_info?": "<MarkupInfo | null>",
        "billable_status?": "<Billable | NotBillable | HasBeenBilled>"
      },
      "description?": "<string>",
      "line_num?": "<number>",
      "linked_txn?": [
        {
          "txn_id": "<string>",
          "txn_type": "<string>",
          "txn_line_id?": "<string>"
        }
      ],
      "project_ref?": {
        "name?": "<string>",
        "value": "<string>"
      }
    }
  ],
  "sync_token?": "<string>",
  "currency_ref?": {
    "name?": "<string>",
    "value": "<string>"
  },
  "global_tax_calculation?": "<TaxExcluded | TaxInclusive | NotApplicable>",
  "txn_date?": "<string>",
  "custom_field?": [
    {
      "definition_id": "<string>",
      "name?": "<string>",
      "type?": "<string>",
      "string_value?": "<string>"
    }
  ],
  "po_email?": "<string | null>",
  "class_ref?": {
    "name?": "<string>",
    "value": "<string>"
  },
  "sales_term_ref?": {
    "name?": "<string>",
    "value": "<string>"
  },
  "linked_txn?": [
    {
      "txn_id": "<string>",
      "txn_type": "<string>",
      "txn_line_id?": "<string>"
    }
  ],
  "memo?": "<string>",
  "po_status?": "<Open | Closed>",
  "transaction_location_type?": "<string>",
  "due_date?": "<string>",
  "metadata?": {
    "created_at": "<string>",
    "updated_at": "<string>"
  },
  "doc_number?": "<string>",
  "private_note?": "<string>",
  "ship_method_ref?": {
    "name?": "<string>",
    "value": "<string>"
  },
  "txn_tax_detail?": {
    "txn_tax_code_ref?": {
      "name?": "<string>",
      "value": "<string>"
    },
    "total_tax_cents?": "<number>",
    "tax_line?": [
      {
        "amount": "<number>",
        "detail_type": "<string>",
        "tax_line_detail": "<TaxLineDetail>"
      }
    ]
  },
  "ship_to?": {
    "name?": "<string>",
    "value": "<string>"
  },
  "exchange_rate?": "<number>",
  "ship_addr?": "<PhysicalAddress | null>",
  "vendor_addr?": "<PhysicalAddress | null>",
  "email_status?": "<string>",
  "total_amt_cents": "<number>",
  "recur_data_ref?": {
    "name?": "<string>",
    "value": "<string>"
  }
}
```

### Request Response

```json
{
  "id": "<string>",
  "created_at": "<string>",
  "updated_at": "<string>",
  "ap_account_ref": {
    "name?": "<string>",
    "value": "<string>"
  },
  "vendor_ref": {
    "name?": "<string>",
    "value": "<string>"
  },
  "line": [
    {
      "id?": "<string>",
      "amount_cents": "<number>",
      "detail_type": "<ItemBasedExpenseLineDetail>",
      "item_based_expense_line_detail?": {
        "item_ref?": {
          "name?": "<string>",
          "value": "<string>"
        },
        "price_level_ref?": {
          "name?": "<string>",
          "value": "<string>"
        },
        "qty?": "<number>",
        "unit_price_cents?": "<number>",
        "tax_inclusive_amt?": "<number>",
        "customer_ref?": {
          "name?": "<string>",
          "value": "<string>"
        },
        "class_ref?": {
          "name?": "<string>",
          "value": "<string>"
        },
        "tax_code_ref?": {
          "name?": "<string>",
          "value": "<string>"
        },
        "markup_info?": "<MarkupInfo | null>",
        "billable_status?": "<Billable | NotBillable | HasBeenBilled>"
      },
      "description?": "<string>",
      "line_num?": "<number>",
      "linked_txn?": [
        {
          "txn_id": "<string>",
          "txn_type": "<string>",
          "txn_line_id?": "<string>"
        }
      ],
      "project_ref?": {
        "name?": "<string>",
        "value": "<string>"
      }
    }
  ],
  "sync_token?": "<string>",
  "currency_ref?": {
    "name?": "<string>",
    "value": "<string>"
  },
  "global_tax_calculation?": "<TaxExcluded | TaxInclusive | NotApplicable>",
  "txn_date?": "<string>",
  "custom_field?": [
    {
      "definition_id": "<string>",
      "name?": "<string>",
      "type?": "<string>",
      "string_value?": "<string>"
    }
  ],
  "po_email?": "<string | null>",
  "class_ref?": {
    "name?": "<string>",
    "value": "<string>"
  },
  "sales_term_ref?": {
    "name?": "<string>",
    "value": "<string>"
  },
  "linked_txn?": [
    {
      "txn_id": "<string>",
      "txn_type": "<string>",
      "txn_line_id?": "<string>"
    }
  ],
  "memo?": "<string>",
  "po_status?": "<Open | Closed>",
  "transaction_location_type?": "<string>",
  "due_date?": "<string>",
  "metadata?": {
    "created_at": "<string>",
    "updated_at": "<string>"
  },
  "doc_number?": "<string>",
  "private_note?": "<string>",
  "ship_method_ref?": {
    "name?": "<string>",
    "value": "<string>"
  },
  "txn_tax_detail?": {
    "txn_tax_code_ref?": {
      "name?": "<string>",
      "value": "<string>"
    },
    "total_tax_cents?": "<number>",
    "tax_line?": [
      {
        "amount": "<number>",
        "detail_type": "<string>",
        "tax_line_detail": "<TaxLineDetail>"
      }
    ]
  },
  "ship_to?": {
    "name?": "<string>",
    "value": "<string>"
  },
  "exchange_rate?": "<number>",
  "ship_addr?": "<PhysicalAddress | null>",
  "vendor_addr?": "<PhysicalAddress | null>",
  "email_status?": "<string>",
  "total_amt_cents": "<number>",
  "recur_data_ref?": {
    "name?": "<string>",
    "value": "<string>"
  }
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/quickbooks/actions/create-purchase-order.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/quickbooks/actions/create-purchase-order.md)

<!-- END  GENERATED CONTENT -->

