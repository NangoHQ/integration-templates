interface SlackMessageAttachment {
    text: string;
    id: number;
    fallback: string;
}

interface SlackBotProfile {
    id: string;
    app_id: string;
    name: string;
    icons: {
        image_36: string;
        image_48: string;
        image_72: string;
    };
    deleted: boolean;
    updated: number;
    team_id: string;
}

interface SlackMessageBlock {
    type: string;
    block_id: string;
    elements: {
        type: string;
        elements: {
            type: string;
            text?: string;
        }[];
    }[];
}

interface SlackMessage {
    text: string;
    username?: string;
    bot_id?: string;
    attachments?: SlackMessageAttachment[];
    type: string;
    subtype?: string;
    ts: string;
    user?: string;
    app_id?: string;
    team?: string;
    bot_profile?: SlackBotProfile;
    blocks?: SlackMessageBlock[];
}

export interface SlackSuccessResponse {
    ok: true;
    channel: string;
    ts: string;
    message: SlackMessage;
    warning?: string;
    response_metadata?: {
        warnings?: string[];
    };
}

interface SlackErrorResponse {
    ok: false;
    error: string;
}

export type SlackResponse = SlackSuccessResponse | SlackErrorResponse;

interface SlackUserProfile {
  title: string;
  phone: string;
  skype: string;
  real_name: string;
  real_name_normalized: string;
  display_name: string;
  display_name_normalized: string;
  fields: null | Record<string, any>;
  status_text: string;
  status_emoji: string;
  status_emoji_display_info: any[];
  email?: string;
  is_custom_image?: boolean;
  image_original?: string;
  status_expiration: number;
  avatar_hash: string;
  guest_invited_by: string;
  huddle_state: string;
  huddle_state_expiration_ts: number;
  first_name: string;
  last_name: string;
  image_24: string;
  image_32: string;
  image_48: string;
  image_72: string;
  image_192: string;
  image_512: string;
  status_text_canonical: string;
  team: string;
}

export interface SlackUserResponse {
  id: string;
  team_id: string;
  name: string;
  deleted: boolean;
  color: string;
  real_name: string;
  tz: string;
  tz_label: string;
  tz_offset: number;
  profile: SlackUserProfile;
  is_admin: boolean;
  is_owner: boolean;
  is_primary_owner: boolean;
  is_restricted: boolean;
  is_ultra_restricted: boolean;
  is_bot: boolean;
  is_app_user: boolean;
  updated: number;
  is_email_confirmed: boolean;
  who_can_share_contact_card: string;
}
