<!-- BEGIN GENERATED CONTENT -->
# Fetch Articles

## General Information

- **Description:** Fetch all help center articles metadata
- **Version:** 2.0.0
- **Group:** Others
- **Scopes:** `hc:read`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_zendesk_fetcharticles`
- **Input Model:** `ActionInput_zendesk_fetcharticles`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/zendesk/actions/fetch-articles.ts)


## Endpoint Reference

### Request Endpoint

`GET /all-articles`

### Request Query Parameters

_No request parameters_

### Request Body

```json
"<null>"
```

### Request Response

```json
{
  "articles": [
    {
      "title": "<string>",
      "id": "<string>",
      "url": "<string>"
    }
  ]
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/zendesk/actions/fetch-articles.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/zendesk/actions/fetch-articles.md)

<!-- END  GENERATED CONTENT -->

