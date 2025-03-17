<!-- BEGIN GENERATED CONTENT -->
# Conversation

## General Information

- **Description:** List the messages in a conversation in reverse chronological order (newest first).
- **Version:** 1.0.1
- **Group:** Conversations
- **Scopes:** _None_
- **Endpoint Type:** Action
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/front/actions/conversation.ts)


## Endpoint Reference

### Request Endpoint

`GET /conversations/all`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "id": "<string>",
  "query?": {
    "limit?": "<number>",
    "page_token?": "<string>",
    "sort_by?": "<string>",
    "sort_order?": "<asc | desc>"
  }
}
```

### Request Response

```json
{
  "messages": [
    {
      "_links": {
        "self": "<string>",
        "related": {
          "conversation": "<string>",
          "message_replied_to?": "<string>",
          "message_seen": "<string>"
        }
      },
      "id": "<string>",
      "version?": "<string | null>",
      "blurb": "<string>",
      "error_type": "<string | null>",
      "type": "<call | custom | email | facebook | front_chat | googleplay | intercom | internal | phone-call | sms | tweet | tweet_dm | whatsapp | yalo_wha>",
      "is_draft": "<boolean>",
      "is_inbound": "<boolean>",
      "draft_mode": "<string | null>",
      "created_at": "<number>",
      "subject": "<string>",
      "author": "<AuthorObj | null>",
      "recipients": [
        {
          "_links": {
            "related": {
              "contact": "<string>"
            }
          },
          "name": "<string>",
          "handle": "<string>",
          "role": "<from | to | cc | bcc>"
        }
      ],
      "body": "<string>",
      "text": "<string>",
      "attachments?": [
        {
          "id": "<string>",
          "filename": "<string>",
          "url": "<string>",
          "content_type": "<string>",
          "size": "<number>",
          "metadata": {
            "is_inline": "<boolean>",
            "cid": "<string>"
          }
        }
      ],
      "signature?": "<SignatureObj | null>",
      "metadata?": {
        "intercom_url?": "<string>",
        "duration?": "<number>",
        "have_been_answered?": "<boolean>",
        "external_id?": "<string>",
        "twitter_url?": "<string>",
        "is_retweet?": "<boolean>",
        "have_been_retweeted?": "<boolean>",
        "have_been_favorited?": "<boolean>",
        "thread_ref?": "<string>",
        "headers?": "<object>",
        "chat_visitor_url?": "<string>"
      }
    }
  ]
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/front/actions/conversation.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/front/actions/conversation.md)

<!-- END  GENERATED CONTENT -->

