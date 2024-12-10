# Tickets

## General Information
- **Description:** Fetches a list of tickets from Zendesk

- **Version:** 1.0.1
- **Group:** Others
- **Scopes:**: tickets:read
- **Endpoint Type:** sync
- **Code:** [🔗](https://github.com/NangoHQ/integration-templates/tree/main/integrations/zendesk/syncs/tickets.ts)

### Request Endpoint

- **Path:** `/tickets`
- **Method:** `GET`

### Request Query Parameters

_No request parameters_

### Request Body

_No request body_

### Request Response

```json
{
  "url": "<string | null>",
  "id": "<number>",
  "external_id": "<string | null>",
  "via": "<Via | null>",
  "created_at": "<string | null>",
  "updated_at": "<string | null>",
  "generated_timestamp": "<number | null>",
  "type": "<string | null>",
  "subject": "<string | null>",
  "raw_subject": "<string | null>",
  "description": "<string | null>",
  "priority": "<string | null>",
  "status": "<string | null>",
  "recipient": "<string | null>",
  "requester_id": "<number | null>",
  "submitter_id": "<number | null>",
  "assignee_id": "<number | null>",
  "organization_id": "<number | null>",
  "group_id": "<number | null>",
  "collaborator_ids": "<number[] | null>",
  "follower_ids": "<number[] | null>",
  "email_cc_ids": "<number[] | null>",
  "forum_topic_id": "<string | null>",
  "problem_id": "<string | null>",
  "has_incidents": "<boolean | null>",
  "is_public": "<boolean | null>",
  "due_at": "<string | null>",
  "tags": "<string[] | null>",
  "custom_fields": "<CustomFields[] | null>",
  "satisfaction_rating": "<object | null>",
  "sharing_agreement_ids": "<number[] | null>",
  "custom_status_id": "<number | null>",
  "fields": "<CustomFields[] | null>",
  "followup_ids": "<number[] | null>",
  "ticket_form_id": "<number | null>",
  "brand_id": "<number | null>",
  "allow_channelback": "<boolean | null>",
  "allow_attachments": "<boolean | null>",
  "from_messaging_channel": "<boolean | null>"
}
```

## Changelog


- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/zendesk/syncs/tickets.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/zendesk/syncs/tickets.md)

<!-- END  GENERATED CONTENT -->

undefined