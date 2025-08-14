<!-- BEGIN GENERATED CONTENT -->
# Post

## General Information

- **Description:** Create a linkedin post with an optional video
- **Version:** 1.0.0
- **Group:** Others
- **Scopes:** `openid, profile, r_basicprofile, w_member_social, email, w_organization_social, r_organization_social`
- **Endpoint Type:** Action
- **Model:** `ActionOutput_linkedin_post`
- **Input Model:** `ActionInput_linkedin_post`
- **Code:** [github.com](https://github.com/NangoHQ/integration-templates/tree/main/integrations/linkedin/actions/post.ts)


## Endpoint Reference

### Request Endpoint

`POST /videos`

### Request Query Parameters

_No request parameters_

### Request Body

```json
{
  "text": "<string>",
  "videoURN": "<string>",
  "videoTitle": "<string>",
  "ownerId": "<string>"
}
```

### Request Response

```json
{
  "succcess": "<boolean>"
}
```

## Changelog

- [Script History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/linkedin/actions/post.ts)
- [Documentation History](https://github.com/NangoHQ/integration-templates/commits/main/integrations/linkedin/actions/post.md)

<!-- END  GENERATED CONTENT -->

