<!-- BEGIN GENERATED CONTENT -->
# Update Journal Entry

## General Information

- **Description:** Update a single journal entry in QuickBooks.
- **Version:** 1.0.0
- **Group:** Journal Entries
- **Scopes:** `com.intuit.quickbooks.accounting`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_quickbooks_updatejournalentry`
- **Input Model:** `ActionInput_quickbooks_updatejournalentry`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/quickbooks/actions/update-journal-entry.ts)


## Endpoint Reference

### Request Endpoint

`PUT /journal-entries`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "id": "<string>",
  "sync_token": "<string>",
  "sparse?": "<boolean>",
  "line_items": [
    {
      "id?": "<string>",
      "detail_type": "<string>",
      "amount?": "<number>",
      "project_ref": {
        "name?": "<string>",
        "value": "<string>"
      },
      "description?": "<string>",
      "line_num?": "<number>",
      "journal_entry_line_detail": {
        "journal_code_ref": {
          "name?": "<string>",
          "value": "<string>"
        },
        "posting_type": "<enum: 'Debit' | 'Credit'>",
        "account_ref": {
          "name?": "<string>",
          "value": "<string>"
        },
        "tax_applicable_on?": "<string>",
        "entity?": {
          "type?": "<string>",
          "entity_ref": {
            "name?": "<string>",
            "value": "<string>"
          }
        },
        "tax_inclusive_amt?": "<number>",
        "class_ref": {
          "name?": "<string>",
          "value": "<string>"
        },
        "department_ref": {
          "name?": "<string>",
          "value": "<string>"
        },
        "tax_code_ref": {
          "name?": "<string>",
          "value": "<string>"
        },
        "billable_status?": "<string>",
        "tax_amount?": "<number>"
      }
    }
  ],
  "currency_ref": {
    "name?": "<string>",
    "value": "<string>"
  },
  "global_tax_calculation?": "<string>",
  "doc_number?": "<string>",
  "private_note?": "<string>",
  "exchange_rate?": "<number>",
  "transaction_location_type?": "<string>",
  "txn_tax_detail?": {
    "txn_tax_code_ref": {
      "name?": "<string>",
      "value": "<string>"
    },
    "total_tax?": "<number>",
    "tax_line?": [
      {
        "detail_type": "<string>",
        "tax_line_detail?": {
          "tax_rate_ref": {
            "name?": "<string>",
            "value": "<string>"
          },
          "net_amount_taxable?": "<number>",
          "percent_based?": "<boolean>",
          "tax_percent?": "<number>"
        },
        "amount?": "<number>"
      }
    ]
  },
  "adjustment?": "<boolean>"
}
```

### Request Response

```json
{
  "created_at": "<string>",
  "updated_at": "<string>",
  "id": "<string>",
  "date": "<string | null>",
  "currency": "<string>",
  "note?": "<string>",
  "lines": [
    {
      "id": "<string>",
      "type": "<string>",
      "account_id": "<string>",
      "account_name": "<string>",
      "net_amount": "<number>",
      "posting_type": "<enum: 'Debit' | 'Credit'>",
      "description": "<string>",
      "entity_type?": "<string>",
      "entity_type_id?": "<string>",
      "entity_type_name?": "<string>",
      "department_id?": "<string>",
      "department_name?": "<string>",
      "class_id?": "<string>",
      "class_name?": "<string>"
    }
  ]
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/quickbooks/actions/update-journal-entry.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/quickbooks/actions/update-journal-entry.md)

<!-- END  GENERATED CONTENT -->

