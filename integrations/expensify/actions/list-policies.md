<!-- BEGIN GENERATED CONTENT -->
# List Policies

## General Information

- **Description:** Action to fetch a list of policies with some relevant information about them

- **Version:** 2.0.1
- **Group:** Others
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Model:** `ExpensifyListPolicyOutput`
- **Input Model:** _None_
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/expensify/actions/list-policies.ts)


## Endpoint Reference

### Request Endpoint

`POST /policies`

### Request Query Parameters

_No request parameters_

### Request Body

_No request body_

### Request Response

```json
{
  "policies": [
    {
      "id": "<string>",
      "type": "<string>",
      "name": "<string>",
      "shouldShowAutoApprovalOptions": "<boolean>",
      "role": "<string>",
      "areCompanyCardsEnabled": "<boolean>",
      "shouldShowCustomReportTitleOption": "<boolean>",
      "areExpensifyCardsEnabled": "<boolean>",
      "areRulesEnabled": "<boolean>",
      "areConnectionsEnabled": "<boolean>",
      "approvalMode": "<string>",
      "areCategoriesEnabled": "<boolean>",
      "areReportFieldsEnabled": "<boolean>",
      "areWorkflowsEnabled": "<boolean>",
      "outputCurrency": "<string>",
      "owner": "<string>",
      "areInvoicesEnabled": "<boolean>",
      "createdAt": "<string>",
      "eReceipts": "<boolean>",
      "shouldShowAutoReimbursementLimitOption": "<boolean>",
      "areDistanceRatesEnabled": "<boolean>",
      "isPolicyExpenseChatEnabled": "<string>",
      "ownerAccountID": "<number>",
      "areTagsEnabled": "<boolean>"
    }
  ]
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/expensify/actions/list-policies.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/expensify/actions/list-policies.md)

<!-- END  GENERATED CONTENT -->

