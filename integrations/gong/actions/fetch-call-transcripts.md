<!-- BEGIN GENERATED CONTENT -->
# Fetch Call Transcripts

## General Information

- **Description:** Fetches a list of call transcripts from Gong

- **Version:** 1.0.0
- **Group:** Calls
- **Scopes:** `api:calls:read:transcript`
- **Endpoint Type:** Action
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/gong/actions/fetch-call-transcripts.ts)


## Endpoint Reference

### Request Endpoint

`GET /fetch-call-transcripts`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "from?": "<string | undefined>",
  "to?": "<string | undefined>",
  "workspace_id?": "<string | undefined>",
  "call_id": [
    "<string>"
  ]
}
```

### Request Response

```json
[
  {
    "call_id": "<string>",
    "transcript": {
      "0": {
        "speaker_id": "<string>",
        "topic": "<string>",
        "sentences": {
          "0": {
            "start": "<number>",
            "end": "<number>",
            "text": "<string>"
          }
        }
      }
    }
  }
]
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/gong/actions/fetch-call-transcripts.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/gong/actions/fetch-call-transcripts.md)

<!-- END  GENERATED CONTENT -->

