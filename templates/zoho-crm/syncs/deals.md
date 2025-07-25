<!-- BEGIN GENERATED CONTENT -->
# Deals

## General Information

- **Description:** Fetches a list of deals/opportunities from zoho crm

- **Version:** 0.0.1
- **Group:** Others
- **Scopes:** `ZohoCRM.modules.deals.READ`
- **Endpoint Type:** Sync
- **Model:** `ZohoCRMDeal`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/zoho-crm/syncs/deals.ts)


## Endpoint Reference

### Request Endpoint

`GET /zoho-crm/deals`

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
  "Owner": {
    "name": "<string>",
    "id": "<string>",
    "email": "<string>"
  },
  "Description": "<string>",
  "$currency_symbol": "<string>",
  "Campaign_Source": {
    "name": "<string>",
    "id": "<string>"
  },
  "$field_states": "<string>",
  "$review_process": {
    "approve": "<boolean>",
    "reject": "<boolean>",
    "resubmit": "<boolean>"
  },
  "Closing_Date": "<date>",
  "Reason_For_Loss__s": "<string>",
  "Last_Activity_Time": "<date>",
  "Modified_By": {
    "name": "<string>",
    "id": "<string>",
    "email": "<string>"
  },
  "$review": "<string>",
  "Lead_Conversion_Time": "<date>",
  "$state": "<string>",
  "$process_flow": "<boolean>",
  "Deal_Name": "<string>",
  "Expected_Revenue": "<integer>",
  "Overall_Sales_Duration": "<integer>",
  "Stage": "<string>",
  "$locked_for_me": "<boolean>",
  "Account_Name": {
    "name": "<string>",
    "id": "<string>"
  },
  "id": "<string>",
  "$approved": "<boolean>",
  "$approval": {
    "delegate": "<boolean>",
    "approve": "<boolean>",
    "reject": "<boolean>",
    "resubmit": "<boolean>"
  },
  "Modified_Time": "<date>",
  "Created_Time": "<date>",
  "Amount": "<integer>",
  "Next_Step": "<string>",
  "Probability": "<integer>",
  "$editable": "<boolean>",
  "$orchestration": "<boolean>",
  "Contact_Name": {
    "name": "<string>",
    "id": "<string>"
  },
  "Sales_Cycle_Duration": "<integer>",
  "Type": "<string>",
  "$in_merge": "<boolean>",
  "Locked__s": "<boolean>",
  "Lead_Source": "<string>",
  "Created_By": {
    "name": "<string>",
    "id": "<string>",
    "email": "<string>"
  },
  "Tag": [
    "<any>"
  ],
  "$zia_owner_assignment": "<string>",
  "$approval_state": "<string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/zoho-crm/syncs/deals.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/zoho-crm/syncs/deals.md)

<!-- END  GENERATED CONTENT -->

