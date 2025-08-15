<!-- BEGIN GENERATED CONTENT -->
# Send Sms

## General Information

- **Description:** Sends an SMS message via ClickSend's API.
- **Version:** 2.0.0
- **Group:** SMS
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Model:** `ActionOutput_clicksend_sendsms`
- **Input Model:** `ActionInput_clicksend_sendsms`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/clicksend/actions/send-sms.ts)


## Endpoint Reference

### Request Endpoint

`POST /sms/send`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "to": "<string>",
  "body": "<string>"
}
```

### Request Response

```json
{
  "id": "<string>",
  "to": "<string>",
  "from": "<string>",
  "body": "<string>",
  "status": "<enum: 'QUEUED' | 'COMPLETED' | 'SCHEDULED' | 'WAIT_APPROVAL' | 'FAILED' | 'CANCELLED' | 'CANCELLED_AFTER_REVIEW' | 'RECEIVED' | 'SENT' | 'SUCCESS'>",
  "createdAt": "<string>",
  "updatedAt": "<string>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/clicksend/actions/send-sms.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/clicksend/actions/send-sms.md)

<!-- END  GENERATED CONTENT -->

