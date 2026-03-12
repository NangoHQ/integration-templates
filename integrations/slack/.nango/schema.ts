export interface SyncMetadata_slack_channels {
};

export interface SlackChannel {
  id: string;
  name: string;
  is_channel: boolean;
  is_group: boolean;
  is_im: boolean;
  created: number;
  creator: string;
  is_archived: boolean;
  is_general: boolean;
  name_normalized: string;
  is_shared: boolean;
  is_private: boolean;
  is_mpim: boolean;
  updated: number;
  num_members: number;
  raw_json: string;
};

export interface SyncMetadata_slack_messages {
  channelsLastSyncDate?: {  [key: string]: string;} | undefined;
};

export interface SlackMessage {
  id: string;
  ts: string;
  channel_id: string;
  thread_ts: string | null;
  app_id: string | null;
  bot_id: string | null;
  display_as_bot: boolean | null;
  is_locked: boolean | null;
  metadata: {  event_type: string;};
  parent_user_id: string | null;
  subtype: string | null;
  text: string | null;
  topic: string | null;
  user_id: string | null;
  raw_json: string;
};

export interface SlackMessageReply {
  id: string;
  ts: string;
  channel_id: string;
  thread_ts: string | null;
  app_id: string | null;
  bot_id: string | null;
  display_as_bot: boolean | null;
  is_locked: boolean | null;
  metadata: {  event_type: string;};
  parent_user_id: string | null;
  subtype: string | null;
  text: string | null;
  topic: string | null;
  user_id: string | null;
  root: {  message_id: string | null;
  ts: string;};
  raw_json: string;
};

export interface SlackMessageReaction {
  id: string;
  message_ts: string;
  thread_ts: string | null;
  channel_id: string;
  user_id: string;
  reaction_name: string;
};

export interface SyncMetadata_slack_users {
};

export interface SlackUser {
  id: string;
  team_id: string;
  name: string;
  deleted: boolean;
  tz: string;
  tz_label: string;
  tz_offset: number;
  profile: {  avatar_hash: string;
  real_name: string | null;
  display_name: string | null;
  real_name_normalized: string | null;
  display_name_normalized: string | null;
  email: string | null;
  image_original?: string | null | undefined;};
  is_admin: boolean;
  is_owner: boolean;
  is_primary_owner: boolean;
  is_restricted: boolean;
  is_ultra_restricted: boolean;
  is_bot: boolean;
  updated: number;
  is_app_user: boolean;
  raw_json: string;
};

export interface ActionInput_slack_addreaction {
  /**
   * The channel containing the message. Example: "C02MB5ZABA7"
   */
  channel_id: string;
  /**
   * Timestamp of the message to react to in "seconds.microseconds" format. Example: "1763887648.424429"
   */
  message_ts: string;
  /**
   * Emoji name without colons. Example: "thumbsup", "heart", "eyes"
   */
  reaction_name: string;
};

export interface ActionOutput_slack_addreaction {
  /**
   * Whether the reaction was added successfully
   */
  ok: boolean;
};

export interface ActionInput_slack_archivechannel {
  /**
   * The channel to archive. Example: "C0A02F9NBCJ"
   */
  channel_id: string;
};

export interface ActionOutput_slack_archivechannel {
  /**
   * Whether the channel was archived successfully
   */
  ok: boolean;
};

export interface ActionInput_slack_createchannel {
  /**
   * Channel name (lowercase, no spaces, max 80 chars). Example: "test-channel-nango"
   */
  name: string;
  /**
   * Whether channel should be private. Default: false
   */
  is_private?: boolean | undefined;
};

export interface ActionOutput_slack_createchannel {
  /**
   * Whether the channel was created successfully
   */
  ok: boolean;
  /**
   * The created channel object
   */
  channel: {  id: string;
  name: string;
  name_normalized: string;
  created: number;
  creator: string;
  is_channel: boolean;
  is_group: boolean;
  is_im: boolean;
  is_mpim: boolean;
  is_private: boolean;
  is_archived: boolean;
  is_general: boolean;
  is_shared: boolean;
  is_ext_shared: boolean;
  is_org_shared: boolean;
  is_pending_ext_shared: boolean;
  is_member?: boolean | undefined;
  unlinked?: number | undefined;
  updated?: number | undefined;
  num_members?: number | undefined;
  context_team_id?: string | undefined;
  parent_conversation?: string | undefined;
  pending_shared?: string[] | undefined;
  pending_connected_team_ids?: string[] | undefined;
  shared_team_ids?: string[] | undefined;
  previous_names?: string[] | undefined;
  topic?: {  value: string;
  creator: string;
  last_set: number;} | undefined;
  purpose?: {  value: string;
  creator: string;
  last_set: number;} | undefined;};
};

export interface ActionInput_slack_deletemessage {
  /**
   * The channel containing the message. Example: "C02MB5ZABA7"
   */
  channel_id: string;
  /**
   * Timestamp of the message to delete. Example: "1764187268.105539"
   */
  message_ts: string;
};

export interface ActionOutput_slack_deletemessage {
  /**
   * Whether the message was deleted successfully
   */
  ok: boolean;
  /**
   * Timestamp of the deleted message
   */
  ts: string;
  /**
   * Channel where the message was deleted
   */
  channel: string;
};

export interface ActionInput_slack_getchannelinfo {
  /**
   * The channel to get info for. Example: "C02MB5ZABA7"
   */
  channel_id: string;
};

export interface ActionOutput_slack_getchannelinfo {
  /**
   * Whether the request was successful
   */
  ok: boolean;
  /**
   * The channel object with details like name, topic, purpose, members count
   */
  channel: {  id: string;
  name: string;
  name_normalized: string;
  created: number;
  creator: string;
  is_channel: boolean;
  is_group: boolean;
  is_im: boolean;
  is_mpim: boolean;
  is_private: boolean;
  is_archived: boolean;
  is_general: boolean;
  is_shared: boolean;
  is_ext_shared: boolean;
  is_org_shared: boolean;
  is_pending_ext_shared: boolean;
  is_member?: boolean | undefined;
  unlinked?: number | undefined;
  updated?: number | undefined;
  num_members?: number | undefined;
  context_team_id?: string | undefined;
  parent_conversation?: string | undefined;
  pending_shared?: string[] | undefined;
  pending_connected_team_ids?: string[] | undefined;
  shared_team_ids?: string[] | undefined;
  previous_names?: string[] | undefined;
  topic?: {  value: string;
  creator: string;
  last_set: number;} | undefined;
  purpose?: {  value: string;
  creator: string;
  last_set: number;} | undefined;};
};

export interface ActionInput_slack_getchannelmembers {
  /**
   * The channel to get members for. Example: "C02MB5ZABA7"
   */
  channel_id: string;
  /**
   * Maximum number of members to return. Default: 100
   */
  limit?: number | undefined;
  /**
   * Pagination cursor from previous response
   */
  cursor?: string | undefined;
};

export interface ActionOutput_slack_getchannelmembers {
  /**
   * Whether the request was successful
   */
  ok: boolean;
  /**
   * Array of user IDs in the channel
   */
  members: string[];
  /**
   * Pagination metadata for next page
   */
  response_metadata?: {  next_cursor?: string | undefined;};
};

export interface ActionInput_slack_getconversationhistory {
  /**
   * The channel to fetch history from. Example: "C02MB5ZABA7"
   */
  channel_id: string;
  /**
   * Number of messages to return. Default: 100, max: 1000
   */
  limit?: number | undefined;
  /**
   * Pagination cursor from previous response
   */
  cursor?: string | undefined;
  /**
   * Only messages after this timestamp. Example: "1234567890.123456"
   */
  oldest_ts?: string | undefined;
  /**
   * Only messages before this timestamp. Example: "1234567890.123456"
   */
  latest_ts?: string | undefined;
};

export interface ActionOutput_slack_getconversationhistory {
  /**
   * Whether the request was successful
   */
  ok: boolean;
  /**
   * Array of message objects
   */
  messages: ({  type: string;
  text?: string | undefined;
  user?: string | undefined;
  ts?: string | undefined;
  thread_ts?: string | undefined;
  team?: string | undefined;
  client_msg_id?: string | undefined;
  subtype?: string | undefined;
  blocks?: ({  type: string;
  block_id?: string | undefined;
  elements?: ({  type: string;
  elements?: ({  type: string;
  text?: string | undefined;
  url?: string | undefined;
  channel_id?: string | undefined;})[];})[];})[];
  files?: ({  id: string;
  created?: number | undefined;
  timestamp?: number | undefined;
  name?: string | undefined;
  title?: string | undefined;
  mimetype?: string | undefined;
  filetype?: string | undefined;
  pretty_type?: string | undefined;
  user?: string | undefined;
  user_team?: string | undefined;
  size?: number | undefined;
  mode?: string | undefined;
  is_external?: boolean | undefined;
  is_public?: boolean | undefined;
  url_private?: string | undefined;
  url_private_download?: string | undefined;
  permalink?: string | undefined;
  permalink_public?: string | undefined;})[];
  attachments?: ({  id?: number | undefined;
  fallback?: string | undefined;
  text?: string | undefined;
  title?: string | undefined;
  title_link?: string | undefined;
  from_url?: string | undefined;
  original_url?: string | undefined;
  service_name?: string | undefined;
  service_icon?: string | undefined;
  image_url?: string | undefined;
  image_width?: number | undefined;
  image_height?: number | undefined;
  thumb_url?: string | undefined;
  thumb_width?: number | undefined;
  thumb_height?: number | undefined;})[];
  reactions?: ({  name: string;
  users: string[];
  count: number;})[] | undefined;
  reply_count?: number | undefined;
  reply_users_count?: number | undefined;
  reply_users?: string[] | undefined;
  latest_reply?: string | undefined;
  is_locked?: boolean | undefined;
  subscribed?: boolean | undefined;
  edited?: {  user: string;
  ts: string;} | undefined;
  upload?: boolean | undefined;
  display_as_bot?: boolean | undefined;})[];
  /**
   * Whether there are more messages to fetch
   */
  has_more: boolean;
  /**
   * Cursor for next page, null if no more pages
   */
  next_cursor: string | null;
};

export interface ActionInput_slack_getdndinfo {
  /**
   * User to get DND info for. Defaults to current user. Example: "U02MDCKS1N0"
   */
  user_id?: string | undefined;
};

export interface ActionOutput_slack_getdndinfo {
  /**
   * Whether the request was successful
   */
  ok: boolean;
  /**
   * Whether DND is currently enabled
   */
  dnd_enabled: boolean;
  /**
   * Unix timestamp when next DND period starts
   */
  next_dnd_start_ts: number;
  /**
   * Unix timestamp when next DND period ends
   */
  next_dnd_end_ts: number;
};

export interface ActionInput_slack_getfileinfo {
  /**
   * The file ID to get info for. Example: "F09UG1QNMK7"
   */
  file: string;
};

export interface ActionOutput_slack_getfileinfo {
  /**
   * Whether the request was successful
   */
  ok: boolean;
  /**
   * The file object with details like name, size, url, etc.
   */
  file: {  id: string;
  created?: number | undefined;
  timestamp?: number | undefined;
  name?: string | undefined;
  title?: string | undefined;
  mimetype?: string | undefined;
  filetype?: string | undefined;
  pretty_type?: string | undefined;
  user?: string | undefined;
  user_team?: string | undefined;
  editable?: boolean | undefined;
  size?: number | undefined;
  mode?: string | undefined;
  is_external?: boolean | undefined;
  external_type?: string | undefined;
  is_public?: boolean | undefined;
  public_url_shared?: boolean | undefined;
  display_as_bot?: boolean | undefined;
  username?: string | undefined;
  url_private?: string | undefined;
  url_private_download?: string | undefined;
  permalink?: string | undefined;
  permalink_public?: string | undefined;
  is_starred?: boolean | undefined;
  has_rich_preview?: boolean | undefined;
  file_access?: string | undefined;};
};

export interface ActionInput_slack_getreactions {
  /**
   * The channel containing the message. Example: "C02MB5ZABA7"
   */
  channel_id: string;
  /**
   * Timestamp of the message to get reactions for. Example: "1234567890.123456"
   */
  message_ts: string;
};

export interface ActionOutput_slack_getreactions {
  /**
   * Whether the request was successful
   */
  ok: boolean;
  /**
   * The type of item (message or file)
   */
  type?: string | undefined;
  /**
   * The message object with reactions attached
   */
  message?: {  type: string;
  text?: string | undefined;
  user?: string | undefined;
  ts?: string | undefined;
  reactions?: ({  name: string;
  users: string[];
  count: number;})[] | undefined;};
};

export interface ActionInput_slack_getteaminfo {
};

export interface ActionOutput_slack_getteaminfo {
  /**
   * Whether the request was successful
   */
  ok: boolean;
  /**
   * The team object with workspace details like name, domain, icon
   */
  team: {  id: string;
  name: string;
  url?: string | undefined;
  domain: string;
  email_domain?: string | undefined;
  icon?: {  image_default?: boolean | undefined;
  image_34?: string | undefined;
  image_44?: string | undefined;
  image_68?: string | undefined;
  image_88?: string | undefined;
  image_102?: string | undefined;
  image_132?: string | undefined;
  image_230?: string | undefined;};
  avatar_base_url?: string | undefined;
  is_verified?: boolean | undefined;};
};

export interface ActionInput_slack_getthreadreplies {
  /**
   * The channel containing the thread. Example: "C02MB5ZABA7"
   */
  channel_id: string;
  /**
   * Timestamp of the parent message. Example: "1234567890.123456"
   */
  thread_ts: string;
  /**
   * Maximum number of replies to return. Default: 100
   */
  limit?: number | undefined;
  /**
   * Pagination cursor from previous response
   */
  cursor?: string | undefined;
};

export interface ActionOutput_slack_getthreadreplies {
  /**
   * Whether the request was successful
   */
  ok: boolean;
  /**
   * Array of message objects in the thread
   */
  messages: ({  type: string;
  text?: string | undefined;
  user?: string | undefined;
  ts?: string | undefined;
  thread_ts?: string | undefined;
  team?: string | undefined;
  client_msg_id?: string | undefined;
  subtype?: string | undefined;
  blocks?: ({  type: string;
  block_id?: string | undefined;
  elements?: ({  type: string;
  elements?: ({  type: string;
  text?: string | undefined;
  url?: string | undefined;
  channel_id?: string | undefined;})[];})[];})[];
  files?: ({  id: string;
  created?: number | undefined;
  timestamp?: number | undefined;
  name?: string | undefined;
  title?: string | undefined;
  mimetype?: string | undefined;
  filetype?: string | undefined;
  pretty_type?: string | undefined;
  user?: string | undefined;
  user_team?: string | undefined;
  size?: number | undefined;
  mode?: string | undefined;
  is_external?: boolean | undefined;
  is_public?: boolean | undefined;
  url_private?: string | undefined;
  url_private_download?: string | undefined;
  permalink?: string | undefined;
  permalink_public?: string | undefined;})[];
  reactions?: ({  name: string;
  users: string[];
  count: number;})[] | undefined;
  reply_count?: number | undefined;
  reply_users_count?: number | undefined;
  reply_users?: string[] | undefined;
  latest_reply?: string | undefined;
  is_locked?: boolean | undefined;
  subscribed?: boolean | undefined;})[];
  /**
   * Whether there are more replies to fetch
   */
  has_more: boolean;
  /**
   * Cursor for next page, null if no more pages
   */
  next_cursor: string | null;
};

export interface ActionInput_slack_getuploadurl {
  /**
   * Name of the file to upload. Example: "document.pdf"
   */
  filename: string;
  /**
   * Size of the file in bytes. Example: 1024
   */
  length: number;
};

export interface ActionOutput_slack_getuploadurl {
  /**
   * Whether the request was successful
   */
  ok: boolean;
  /**
   * The URL to upload the file to
   */
  upload_url: string;
  /**
   * The file ID to use when completing the upload
   */
  file_id: string;
};

export interface ActionInput_slack_getuserinfo {
  /**
   * The user ID to get info for. Example: "U02MDCKS1N0"
   */
  user_id: string;
};

export interface ActionOutput_slack_getuserinfo {
  /**
   * Whether the request was successful
   */
  ok: boolean;
  /**
   * The user object with profile details like name, email, avatar
   */
  user: {  id: string;
  team_id?: string | undefined;
  name?: string | undefined;
  deleted?: boolean | undefined;
  color?: string | undefined;
  real_name?: string | undefined;
  tz?: string | undefined;
  tz_label?: string | undefined;
  tz_offset?: number | undefined;
  profile?: {  title?: string | undefined;
  phone?: string | undefined;
  skype?: string | undefined;
  real_name?: string | undefined;
  real_name_normalized?: string | undefined;
  display_name?: string | undefined;
  display_name_normalized?: string | undefined;
  status_text?: string | undefined;
  status_emoji?: string | undefined;
  status_expiration?: number | undefined;
  avatar_hash?: string | undefined;
  first_name?: string | undefined;
  last_name?: string | undefined;
  email?: string | undefined;
  image_24?: string | undefined;
  image_32?: string | undefined;
  image_48?: string | undefined;
  image_72?: string | undefined;
  image_192?: string | undefined;
  image_512?: string | undefined;
  team?: string | undefined;};
  is_admin?: boolean | undefined;
  is_owner?: boolean | undefined;
  is_primary_owner?: boolean | undefined;
  is_restricted?: boolean | undefined;
  is_ultra_restricted?: boolean | undefined;
  is_bot?: boolean | undefined;
  is_app_user?: boolean | undefined;
  updated?: number | undefined;
  is_email_confirmed?: boolean | undefined;
  who_can_share_contact_card?: string | undefined;};
};

export interface ActionInput_slack_getuserpresence {
  /**
   * The user ID to get presence for. Example: "U02MDCKS1N0"
   */
  user_id: string;
};

export interface ActionOutput_slack_getuserpresence {
  /**
   * Whether the request was successful
   */
  ok: boolean;
  /**
   * The user presence status: "active" or "away"
   */
  presence: string;
};

export interface ActionInput_slack_getuserprofile {
  /**
   * User ID to get profile for. Defaults to current user. Example: "U02MDCKS1N0"
   */
  user_id?: string | undefined;
};

export interface ActionOutput_slack_getuserprofile {
  /**
   * Whether the request was successful
   */
  ok: boolean;
  /**
   * The user profile object with fields like display_name, status_text, email
   */
  profile: {  title?: string | undefined;
  phone?: string | undefined;
  skype?: string | undefined;
  real_name?: string | undefined;
  real_name_normalized?: string | undefined;
  display_name?: string | undefined;
  display_name_normalized?: string | undefined;
  status_text?: string | undefined;
  status_emoji?: string | undefined;
  status_expiration?: number | undefined;
  status_text_canonical?: string | undefined;
  avatar_hash?: string | undefined;
  first_name?: string | undefined;
  last_name?: string | undefined;
  email?: string | undefined;
  image_original?: string | undefined;
  image_24?: string | undefined;
  image_32?: string | undefined;
  image_48?: string | undefined;
  image_72?: string | undefined;
  image_192?: string | undefined;
  image_512?: string | undefined;
  image_1024?: string | undefined;
  is_custom_image?: boolean | undefined;
  huddle_state?: string | undefined;
  huddle_state_expiration_ts?: number | undefined;};
};

export interface ActionInput_slack_invitetochannel {
  /**
   * The channel to invite users to. Example: "C02MB5ZABA7"
   */
  channel_id: string;
  /**
   * Comma-separated list of user IDs to invite. Example: "U02MDCKS1N0,U01ABC123"
   */
  user_ids: string;
};

export interface ActionOutput_slack_invitetochannel {
  /**
   * Whether the request was successful
   */
  ok: boolean;
  /**
   * The updated channel object
   */
  channel: {  id: string;
  name: string;
  name_normalized: string;
  created: number;
  creator: string;
  is_channel: boolean;
  is_group: boolean;
  is_im: boolean;
  is_mpim: boolean;
  is_private: boolean;
  is_archived: boolean;
  is_general: boolean;
  is_shared: boolean;
  is_ext_shared: boolean;
  is_org_shared: boolean;
  is_pending_ext_shared: boolean;
  is_member?: boolean | undefined;
  unlinked?: number | undefined;
  updated?: number | undefined;
  num_members?: number | undefined;
  context_team_id?: string | undefined;
  parent_conversation?: string | undefined;
  pending_shared?: string[] | undefined;
  pending_connected_team_ids?: string[] | undefined;
  shared_team_ids?: string[] | undefined;
  previous_names?: string[] | undefined;
  topic?: {  value: string;
  creator: string;
  last_set: number;} | undefined;
  purpose?: {  value: string;
  creator: string;
  last_set: number;} | undefined;};
};

export interface ActionInput_slack_joinchannel {
  /**
   * The channel to join. Example: "C02MB5ZABA7"
   */
  channel_id: string;
};

export interface ActionOutput_slack_joinchannel {
  /**
   * Whether the request was successful
   */
  ok: boolean;
  channel: {  id: string;
  name: string;
  is_channel: boolean;
  is_group: boolean;
  is_im: boolean;
  is_mpim: boolean;
  is_private: boolean;
  created: number;
  is_archived: boolean;
  is_general: boolean;
  unlinked: number;
  name_normalized: string;
  is_shared: boolean;
  is_org_shared: boolean;
  is_pending_ext_shared: boolean;
  pending_shared: string[];
  context_team_id: string;
  updated: number;
  parent_conversation: string;
  creator: string;
  is_ext_shared: boolean;
  shared_team_ids: string[];
  pending_connected_team_ids: string[];
  is_member: boolean;
  topic: {  value: string;
  creator: string;
  last_set: number;};
  purpose: {  value: string;
  creator: string;
  last_set: number;};
  previous_names: string[];};
};

export interface ActionInput_slack_leavechannel {
  /**
   * The channel to leave. Example: "C02MB5ZABA7"
   */
  channel_id: string;
};

export interface ActionOutput_slack_leavechannel {
  /**
   * Whether the request was successful
   */
  ok: boolean;
};

export interface ActionInput_slack_listchannels {
  /**
   * Comma-separated list of channel types. Example: "public_channel,private_channel"
   */
  types?: string | undefined;
  /**
   * Maximum number of channels to return. Default: 100
   */
  limit?: number | undefined;
  /**
   * Pagination cursor from previous response
   */
  cursor?: string | undefined;
};

export interface ActionOutput_slack_listchannels {
  /**
   * Whether the request was successful
   */
  ok: boolean;
  /**
   * Array of channel objects
   */
  channels: ({  id: string;
  name: string;
  name_normalized: string;
  created: number;
  creator: string;
  is_channel: boolean;
  is_group: boolean;
  is_im: boolean;
  is_mpim: boolean;
  is_private: boolean;
  is_archived: boolean;
  is_general: boolean;
  is_shared: boolean;
  is_ext_shared: boolean;
  is_org_shared: boolean;
  is_pending_ext_shared: boolean;
  is_member?: boolean | undefined;
  unlinked?: number | undefined;
  updated?: number | undefined;
  num_members?: number | undefined;
  context_team_id?: string | undefined;
  parent_conversation?: string | undefined;
  pending_shared?: string[] | undefined;
  pending_connected_team_ids?: string[] | undefined;
  shared_team_ids?: string[] | undefined;
  previous_names?: string[] | undefined;
  topic?: {  value: string;
  creator: string;
  last_set: number;} | undefined;
  purpose?: {  value: string;
  creator: string;
  last_set: number;} | undefined;})[];
  /**
   * Cursor for next page, null if no more pages
   */
  next_cursor: string | null;
};

export interface ActionInput_slack_listcustomemoji {
};

export interface ActionOutput_slack_listcustomemoji {
  /**
   * Whether the request was successful
   */
  ok: boolean;
  /**
   * Object mapping emoji names to URLs or aliases (e.g., "alias:squirrel")
   */
  emoji: {  [key: string]: string;};
};

export interface ActionInput_slack_listfiles {
  /**
   * Filter by channel. Example: "C02MB5ZABA7"
   */
  channel_id?: string | undefined;
  /**
   * Filter by user who created the file. Example: "U02MDCKS1N0"
   */
  user_id?: string | undefined;
  /**
   * Filter by file types. Example: "images,pdfs"
   */
  types?: string | undefined;
  /**
   * Number of files to return per page. Default: 100
   */
  count?: number | undefined;
  /**
   * Page number of results. Default: 1
   */
  page?: number | undefined;
};

export interface ActionOutput_slack_listfiles {
  /**
   * Whether the request was successful
   */
  ok: boolean;
  /**
   * Array of file objects
   */
  files: ({  /**
   * The file ID
   */
  id: string;
  /**
   * The filename
   */
  name: string | null;
  /**
   * The file title
   */
  title: string | null;
  /**
   * The MIME type
   */
  mimetype: string | null;
  /**
   * The file type extension
   */
  filetype: string | null;
  /**
   * File size in bytes
   */
  size: number | null;
  /**
   * Unix timestamp when file was created
   */
  created: number | null;
  /**
   * Unix timestamp of the file
   */
  timestamp: number | null;})[];
  /**
   * Pagination information
   */
  paging: {  /**
   * Number of files per page
   */
  count: number;
  /**
   * Total number of files
   */
  total: number;
  /**
   * Current page number
   */
  page: number;
  /**
   * Total number of pages
   */
  pages: number;};
};

export interface ActionInput_slack_listpins {
  /**
   * The channel to list pinned items for. Example: "C02MB5ZABA7"
   */
  channel_id: string;
};

export interface ActionOutput_slack_listpins {
  /**
   * Whether the request was successful
   */
  ok: boolean;
  /**
   * Array of pinned items (messages, files)
   */
  items: ({  type: string;
  created?: number | undefined;
  created_by?: string | undefined;
  message?: {  type: string;
  text?: string | undefined;
  user?: string | undefined;
  ts?: string | undefined;};
  channel?: string | undefined;})[];
};

export interface ActionInput_slack_listscheduledmessages {
  /**
   * Filter by channel. Example: "C02MB5ZABA7"
   */
  channel_id?: string | undefined;
  /**
   * Only include messages before this timestamp. Example: 1234567890
   */
  latest_ts?: number | undefined;
  /**
   * Only include messages after this timestamp. Example: 1234567890
   */
  oldest_ts?: number | undefined;
};

export interface ActionOutput_slack_listscheduledmessages {
  /**
   * Whether the request was successful
   */
  ok: boolean;
  /**
   * Array of scheduled message objects
   */
  scheduled_messages: ({  id: string;
  channel_id: string;
  post_at: number;
  date_created: number;
  text?: string | undefined;})[];
};

export interface ActionInput_slack_listusergroupmembers {
  /**
   * The user group ID to get members for. Example: "S0614TZR7"
   */
  usergroup: string;
};

export interface ActionOutput_slack_listusergroupmembers {
  /**
   * Whether the request was successful
   */
  ok: boolean;
  /**
   * Array of user IDs in the group
   */
  users: string[];
};

export interface ActionInput_slack_listusergroups {
  /**
   * Include disabled user groups. Default: false
   */
  include_disabled?: boolean | undefined;
  /**
   * Include member counts. Default: false
   */
  include_count?: boolean | undefined;
};

export interface ActionOutput_slack_listusergroups {
  /**
   * Whether the request was successful
   */
  ok: boolean;
  /**
   * Array of user group objects
   */
  usergroups: ({  id: string;
  team_id: string;
  is_usergroup: boolean;
  is_subteam?: boolean | undefined;
  name: string;
  description?: string | undefined;
  handle: string;
  is_external?: boolean | undefined;
  date_create?: number | undefined;
  date_update?: number | undefined;
  date_delete?: number | undefined;
  auto_type?: string | undefined;
  auto_provision?: boolean | undefined;
  enterprise_subteam_id?: string | undefined;
  created_by?: string | undefined;
  updated_by?: string | undefined;
  deleted_by?: string | undefined;
  prefs?: {  channels?: string[] | undefined;
  groups?: string[] | undefined;};
  user_count?: number | undefined;
  channel_count?: number | undefined;})[];
};

export interface ActionInput_slack_listuserreactions {
  /**
   * Maximum number of items to return. Default: 100
   */
  limit?: number | undefined;
  /**
   * Pagination cursor from previous response
   */
  cursor?: string | undefined;
};

export interface ActionOutput_slack_listuserreactions {
  /**
   * Whether the request was successful
   */
  ok: boolean;
  /**
   * Array of items the user has reacted to
   */
  items: ({  type: string;
  channel?: string | undefined;
  message?: {  type: string;
  text?: string | undefined;
  user?: string | undefined;
  ts?: string | undefined;
  reactions?: ({  name: string;
  users: string[];
  count: number;})[] | undefined;};})[];
  /**
   * Pagination metadata including next_cursor
   */
  response_metadata: {  next_cursor?: string | undefined;};
};

export interface ActionInput_slack_listusers {
  /**
   * Maximum number of users to return. Default: 100
   */
  limit?: number | undefined;
  /**
   * Pagination cursor from previous response
   */
  cursor?: string | undefined;
};

export interface ActionOutput_slack_listusers {
  /**
   * Whether the request was successful
   */
  ok: boolean;
  /**
   * Array of user objects
   */
  members: ({  id: string;
  team_id?: string | undefined;
  name?: string | undefined;
  deleted?: boolean | undefined;
  color?: string | undefined;
  real_name?: string | undefined;
  tz?: string | undefined;
  tz_label?: string | undefined;
  tz_offset?: number | undefined;
  profile?: {  title?: string | undefined;
  phone?: string | undefined;
  skype?: string | undefined;
  real_name?: string | undefined;
  real_name_normalized?: string | undefined;
  display_name?: string | undefined;
  display_name_normalized?: string | undefined;
  status_text?: string | undefined;
  status_emoji?: string | undefined;
  status_expiration?: number | undefined;
  avatar_hash?: string | undefined;
  first_name?: string | undefined;
  last_name?: string | undefined;
  email?: string | undefined;
  image_24?: string | undefined;
  image_32?: string | undefined;
  image_48?: string | undefined;
  image_72?: string | undefined;
  image_192?: string | undefined;
  image_512?: string | undefined;
  team?: string | undefined;};
  is_admin?: boolean | undefined;
  is_owner?: boolean | undefined;
  is_primary_owner?: boolean | undefined;
  is_restricted?: boolean | undefined;
  is_ultra_restricted?: boolean | undefined;
  is_bot?: boolean | undefined;
  is_app_user?: boolean | undefined;
  updated?: number | undefined;
  is_email_confirmed?: boolean | undefined;
  who_can_share_contact_card?: string | undefined;})[];
  /**
   * Pagination metadata including next_cursor
   */
  response_metadata: {  next_cursor?: string | undefined;};
};

export interface ActionInput_slack_lookupuserbyemail {
  /**
   * The email address to lookup. Example: "user@example.com"
   */
  email: string;
};

export interface ActionOutput_slack_lookupuserbyemail {
  /**
   * Whether the request was successful
   */
  ok: boolean;
  /**
   * The user object if found
   */
  user: {  id: string;
  team_id?: string | undefined;
  name?: string | undefined;
  deleted?: boolean | undefined;
  color?: string | undefined;
  real_name?: string | undefined;
  tz?: string | undefined;
  tz_label?: string | undefined;
  tz_offset?: number | undefined;
  profile?: {  title?: string | undefined;
  phone?: string | undefined;
  skype?: string | undefined;
  real_name?: string | undefined;
  real_name_normalized?: string | undefined;
  display_name?: string | undefined;
  display_name_normalized?: string | undefined;
  status_text?: string | undefined;
  status_emoji?: string | undefined;
  status_expiration?: number | undefined;
  avatar_hash?: string | undefined;
  first_name?: string | undefined;
  last_name?: string | undefined;
  email?: string | undefined;
  image_24?: string | undefined;
  image_32?: string | undefined;
  image_48?: string | undefined;
  image_72?: string | undefined;
  image_192?: string | undefined;
  image_512?: string | undefined;
  team?: string | undefined;};
  is_admin?: boolean | undefined;
  is_owner?: boolean | undefined;
  is_primary_owner?: boolean | undefined;
  is_restricted?: boolean | undefined;
  is_ultra_restricted?: boolean | undefined;
  is_bot?: boolean | undefined;
  is_app_user?: boolean | undefined;
  updated?: number | undefined;
  is_email_confirmed?: boolean | undefined;
  who_can_share_contact_card?: string | undefined;};
};

export interface ActionInput_slack_markasread {
  /**
   * The channel to mark as read. Example: "C02MB5ZABA7"
   */
  channel_id: string;
  /**
   * Timestamp of the message to mark as read. Example: "1234567890.123456"
   */
  message_ts: string;
};

export interface ActionOutput_slack_markasread {
  /**
   * Whether the request was successful
   */
  ok: boolean;
};

export interface ActionInput_slack_opendm {
  /**
   * Comma-separated list of user IDs. Example: "U02MDCKS1N0,U01ABC123"
   */
  users: string;
  /**
   * Return the full IM channel object. Default: false
   */
  return_im?: boolean | undefined;
};

export interface ActionOutput_slack_opendm {
  /**
   * Whether the request was successful
   */
  ok: boolean;
  /**
   * The opened DM channel
   */
  channel: {  /**
   * The DM channel ID
   */
  id: string;};
};

export interface ActionInput_slack_pinmessage {
  /**
   * The channel containing the message. Example: "C02MB5ZABA7"
   */
  channel_id: string;
  /**
   * Timestamp of the message to pin. Example: "1234567890.123456"
   */
  message_ts: string;
};

export interface ActionOutput_slack_pinmessage {
  /**
   * Whether the request was successful
   */
  ok: boolean;
};

export interface ActionInput_slack_postmessage {
  /**
   * Channel, DM, or group to post to. Example: "C02MB5ZABA7"
   */
  channel_id: string;
  /**
   * Message text content. Supports Slack markdown. Example: "Hello *world*!"
   */
  text: string;
  /**
   * Parent message timestamp to reply in thread. Omit for top-level message. Example: "1763887648.424429"
   */
  thread_ts?: string | undefined;
  /**
   * Slack Block Kit blocks for rich formatting. See: https://api.slack.com/block-kit
   */
  blocks?: ({  type: string;
  block_id?: string | undefined;
  text?: {  type: 'plain_text' | 'mrkdwn';
  text: string;
  emoji?: boolean | undefined;
  verbatim?: boolean | undefined;};
  elements?: ({  type: string;
  text?: {  type: 'plain_text' | 'mrkdwn';
  text: string;
  emoji?: boolean | undefined;
  verbatim?: boolean | undefined;};
  action_id?: string | undefined;
  url?: string | undefined;
  value?: string | undefined;
  style?: 'primary' | 'danger' | undefined;})[];
  accessory?: {  type: string;
  text?: {  type: 'plain_text' | 'mrkdwn';
  text: string;
  emoji?: boolean | undefined;
  verbatim?: boolean | undefined;};
  action_id?: string | undefined;
  url?: string | undefined;
  value?: string | undefined;
  style?: 'primary' | 'danger' | undefined;};
  fields?: ({  type: 'plain_text' | 'mrkdwn';
  text: string;
  emoji?: boolean | undefined;
  verbatim?: boolean | undefined;})[];})[];
};

export interface ActionOutput_slack_postmessage {
  /**
   * Whether the message was posted successfully
   */
  ok: boolean;
  /**
   * Timestamp of the posted message. Example: "1763887648.424429"
   */
  ts: string;
  /**
   * Channel where message was posted. Example: "C02MB5ZABA7"
   */
  channel: string;
  message: {  /**
   * The message text as stored
   */
  text: string;
  /**
   * Message type, typically "message"
   */
  type: string;
  /**
   * User ID who posted. Example: "U07E8G7J57T"
   */
  user: string;};
};

export interface ActionInput_slack_removefromchannel {
  /**
   * The channel to remove the user from. Example: "C02MB5ZABA7"
   */
  channel_id: string;
  /**
   * The user ID to remove. Example: "U02MDCKS1N0"
   */
  user_id: string;
};

export interface ActionOutput_slack_removefromchannel {
  /**
   * Whether the request was successful
   */
  ok: boolean;
};

export interface ActionInput_slack_removereaction {
  /**
   * The channel containing the message. Example: "C02MB5ZABA7"
   */
  channel_id: string;
  /**
   * Timestamp of the message. Example: "1234567890.123456"
   */
  message_ts: string;
  /**
   * The emoji name without colons. Example: "thumbsup"
   */
  reaction_name: string;
};

export interface ActionOutput_slack_removereaction {
  /**
   * Whether the request was successful
   */
  ok: boolean;
};

export interface ActionInput_slack_renamechannel {
  /**
   * The channel to rename. Example: "C02MB5ZABA7"
   */
  channel_id: string;
  /**
   * The new name for the channel. Example: "new-channel-name"
   */
  channel_name: string;
};

export interface ActionOutput_slack_renamechannel {
  /**
   * Whether the request was successful
   */
  ok: boolean;
  /**
   * The updated channel object
   */
  channel: {  id: string;
  name: string;
  name_normalized: string;
  created: number;
  creator: string;
  is_channel: boolean;
  is_group: boolean;
  is_im: boolean;
  is_mpim: boolean;
  is_private: boolean;
  is_archived: boolean;
  is_general: boolean;
  is_shared: boolean;
  is_ext_shared: boolean;
  is_org_shared: boolean;
  is_pending_ext_shared: boolean;
  is_member?: boolean | undefined;
  unlinked?: number | undefined;
  updated?: number | undefined;
  num_members?: number | undefined;
  context_team_id?: string | undefined;
  parent_conversation?: string | undefined;
  pending_shared?: string[] | undefined;
  pending_connected_team_ids?: string[] | undefined;
  shared_team_ids?: string[] | undefined;
  previous_names?: string[] | undefined;
  topic?: {  value: string;
  creator: string;
  last_set: number;} | undefined;
  purpose?: {  value: string;
  creator: string;
  last_set: number;} | undefined;};
};

export interface ActionInput_slack_schedulemessage {
  /**
   * The channel to post to. Example: "C02MB5ZABA7"
   */
  channel_id: string;
  /**
   * The message text. Example: "Hello, world!"
   */
  text: string;
  /**
   * Unix timestamp for when to post. Example: 1735689600
   */
  post_at: number;
  /**
   * Timestamp of thread to reply to. Example: "1234567890.123456"
   */
  thread_ts?: string | undefined;
};

export interface ActionOutput_slack_schedulemessage {
  /**
   * Whether the request was successful
   */
  ok: boolean;
  /**
   * The ID of the scheduled message
   */
  scheduled_message_id: string;
  /**
   * Unix timestamp when the message will be posted
   */
  post_at: number;
};

export interface ActionInput_slack_searchfiles {
  /**
   * The search query. Example: "project report"
   */
  query: string;
  /**
   * Number of results per page. Default: 20
   */
  count?: number | undefined;
  /**
   * Page number of results. Default: 1
   */
  page?: number | undefined;
  /**
   * Sort by relevance or recency. Default: "score"
   */
  sort?: 'score' | 'timestamp' | undefined;
  /**
   * Sort direction. Default: "desc"
   */
  sort_dir?: 'asc' | 'desc' | undefined;
};

export interface ActionOutput_slack_searchfiles {
  /**
   * Whether the request was successful
   */
  ok: boolean;
  /**
   * Search results
   */
  files: {  /**
   * Total number of matching files
   */
  total: number;
  /**
   * Array of matching file objects
   */
  matches: ({  /**
   * The file ID
   */
  id: string;
  /**
   * The filename
   */
  name: string;
  /**
   * The file title
   */
  title: string;
  /**
   * The MIME type
   */
  mimetype: string;
  /**
   * The file type extension
   */
  filetype: string;
  /**
   * File size in bytes
   */
  size: number;
  /**
   * Private URL to access the file
   */
  url_private: string;
  /**
   * Permalink to the file in Slack
   */
  permalink: string;
  /**
   * Unix timestamp when file was created
   */
  timestamp: number;})[];
  /**
   * Pagination information
   */
  pagination: {  /**
   * Total count of results
   */
  total_count: number;
  /**
   * Current page number
   */
  page: number;
  /**
   * Results per page
   */
  per_page: number;
  /**
   * Total number of pages
   */
  page_count: number;
  /**
   * First result index
   */
  first: number;
  /**
   * Last result index
   */
  last: number;};};
};

export interface ActionInput_slack_searchmessages {
  /**
   * The search query. Example: "important meeting"
   */
  query: string;
  /**
   * Number of results per page. Default: 20
   */
  count?: number | undefined;
  /**
   * Page number of results. Default: 1
   */
  page?: number | undefined;
  /**
   * Sort by relevance or recency. Default: "score"
   */
  sort?: 'score' | 'timestamp' | undefined;
  /**
   * Sort direction. Default: "desc"
   */
  sort_dir?: 'asc' | 'desc' | undefined;
};

export interface ActionOutput_slack_searchmessages {
  /**
   * Whether the request was successful
   */
  ok: boolean;
  /**
   * Search results
   */
  messages: {  /**
   * Total number of matching messages
   */
  total: number;
  /**
   * Array of matching message objects
   */
  matches: ({  /**
   * The type of message
   */
  type: string;
  /**
   * Message timestamp
   */
  ts: string;
  /**
   * The message text
   */
  text: string;
  /**
   * Channel information
   */
  channel: {  /**
   * The channel ID
   */
  id: string;
  /**
   * The channel name
   */
  name: string;};
  /**
   * The user ID who sent the message
   */
  user: string | null;
  /**
   * The username who sent the message
   */
  username: string | null;
  /**
   * Permalink to the message in Slack
   */
  permalink: string;})[];
  /**
   * Pagination information
   */
  pagination: {  /**
   * Total count of results
   */
  total_count: number;
  /**
   * Current page number
   */
  page: number;
  /**
   * Results per page
   */
  per_page: number;
  /**
   * Total number of pages
   */
  page_count: number;
  /**
   * First result index
   */
  first: number;
  /**
   * Last result index
   */
  last: number;};};
};

export interface ActionInput_slack_sendmessage {
  channel: string;
  text: string;
};

export interface ActionOutput_slack_sendmessage {
  ok: boolean;
  channel?: string | undefined;
  ts?: string | undefined;
  message?: string | undefined;
  warning?: string | undefined;
  error?: string | undefined;
  raw_json: string;
};

export interface ActionInput_slack_setchannelpurpose {
  /**
   * The channel to update. Example: "C02MB5ZABA7"
   */
  channel_id: string;
  /**
   * The new purpose text. Example: "Discussion about project updates"
   */
  purpose: string;
};

export interface ActionOutput_slack_setchannelpurpose {
  /**
   * Whether the request was successful
   */
  ok: boolean;
  /**
   * The updated purpose text
   */
  purpose: string;
};

export interface ActionInput_slack_setchanneltopic {
  /**
   * The channel to update. Example: "C02MB5ZABA7"
   */
  channel_id: string;
  /**
   * The new topic text. Example: "Q4 Planning Discussion"
   */
  topic: string;
};

export interface ActionOutput_slack_setchanneltopic {
  /**
   * Whether the request was successful
   */
  ok: boolean;
  /**
   * The updated topic text
   */
  topic: string;
};

export interface ActionInput_slack_setuserpresence {
  /**
   * The presence status to set: "auto" or "away". Example: "away"
   */
  presence: string;
};

export interface ActionOutput_slack_setuserpresence {
  /**
   * Whether the request was successful
   */
  ok: boolean;
};

export interface ActionInput_slack_unarchivechannel {
  /**
   * The channel to unarchive. Example: "C02MB5ZABA7"
   */
  channel_id: string;
};

export interface ActionOutput_slack_unarchivechannel {
  /**
   * Whether the request was successful
   */
  ok: boolean;
};

export interface ActionInput_slack_unpinmessage {
  /**
   * The channel containing the pinned message. Example: "C02MB5ZABA7"
   */
  channel_id: string;
  /**
   * Timestamp of the message to unpin. Example: "1234567890.123456"
   */
  message_ts: string;
};

export interface ActionOutput_slack_unpinmessage {
  /**
   * Whether the request was successful
   */
  ok: boolean;
};

export interface ActionInput_slack_updatemessage {
  /**
   * The channel containing the message. Example: "C02MB5ZABA7"
   */
  channel_id: string;
  /**
   * Timestamp of the message to update. Example: "1234567890.123456"
   */
  message_ts: string;
  /**
   * New message text. Example: "Updated message content"
   */
  text?: string | undefined;
  /**
   * Array of Block Kit blocks for rich formatting
   */
  blocks?: ({  type: string;
  block_id?: string | undefined;
  text?: {  type: 'plain_text' | 'mrkdwn';
  text: string;
  emoji?: boolean | undefined;
  verbatim?: boolean | undefined;};
  elements?: ({  type: string;
  text?: {  type: 'plain_text' | 'mrkdwn';
  text: string;
  emoji?: boolean | undefined;
  verbatim?: boolean | undefined;};
  action_id?: string | undefined;
  url?: string | undefined;
  value?: string | undefined;
  style?: 'primary' | 'danger' | undefined;})[];
  accessory?: {  type: string;
  text?: {  type: 'plain_text' | 'mrkdwn';
  text: string;
  emoji?: boolean | undefined;
  verbatim?: boolean | undefined;};
  action_id?: string | undefined;
  url?: string | undefined;
  value?: string | undefined;
  style?: 'primary' | 'danger' | undefined;};
  fields?: ({  type: 'plain_text' | 'mrkdwn';
  text: string;
  emoji?: boolean | undefined;
  verbatim?: boolean | undefined;})[];})[];
};

export interface ActionOutput_slack_updatemessage {
  /**
   * Whether the request was successful
   */
  ok: boolean;
  /**
   * Timestamp of the updated message
   */
  ts: string;
  /**
   * Channel where the message was updated
   */
  channel: string;
  /**
   * The updated message text
   */
  text: string;
};
