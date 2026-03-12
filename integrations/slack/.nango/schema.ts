export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

export interface Conversation {
  id: string;
  name: string | null;
  created: number;
  creator: string | null;
  is_archived: boolean;
  is_general: boolean;
  is_channel: boolean;
  is_group: boolean;
  is_im: boolean;
  is_mpim: boolean;
  is_private: boolean;
  is_shared: boolean;
  is_ext_shared: boolean;
  is_org_shared: boolean;
  updated: number;
  num_members: number | null;
  topic: {  value: string;
  creator: string;
  last_set: number;} | null;
  purpose: {  value: string;
  creator: string;
  last_set: number;} | null;
  members: string[];
};

export interface SyncMetadata_slack_syncchannels {
  /**
   * Whether to auto-join public channels
   */
  joinPublicChannels?: boolean | undefined;
};

export interface Channel {
  id: string;
  name: string | null;
  name_normalized: string | null;
  created: number;
  creator: string | null;
  is_archived: boolean;
  is_general: boolean;
  is_private: boolean;
  is_channel: boolean;
  is_group: boolean;
  is_im: boolean;
  is_mpim: boolean;
  is_shared?: boolean | undefined;
  is_org_shared?: boolean | undefined;
  is_ext_shared?: boolean | undefined;
  is_pending_ext_shared?: boolean | undefined;
  is_member?: boolean | undefined;
  num_members?: number | undefined;
  topic: {  value: string;
  creator: string | null;
  last_set: number;};
  purpose: {  value: string;
  creator: string | null;
  last_set: number;};
};

export interface Message {
  id: string;
  channel_id: string;
  channel_name: string;
  user_id: string;
  user_name?: string | undefined;
  text: string;
  timestamp: string;
  thread_ts?: string | undefined;
  parent_ts?: string | undefined;
  is_thread_reply?: boolean | undefined;
  reactions?: ({  name: string;
  count: number;
  users: string[];})[] | undefined;
  reply_count?: number | undefined;
  reply_users?: string[] | undefined;
  created_at: string;
};

export interface ActionInput_slack_addreaction {
  /**
   * The channel ID where the message is located. Example: "C1234567890"
   */
  channel_id: string;
  /**
   * The timestamp of the message to react to. Example: "1234567890.123456"
   */
  timestamp: string;
  /**
   * The name of the emoji to use (without colons). Example: "thumbsup"
   */
  emoji_name: string;
};

export interface ActionOutput_slack_addreaction {
  ok: boolean;
};

export interface ActionInput_slack_archivechannel {
  /**
   * The ID of the channel to archive. Example: "C1234567890"
   */
  channel_id: string;
};

export interface ActionOutput_slack_archivechannel {
  /**
   * Whether the request was successful
   */
  ok: boolean;
  /**
   * Error message if the request failed
   */
  error?: string | undefined;
};

export interface ActionInput_slack_createconversation {
  /**
   * Name of the channel to create. Must be lowercase, contain only letters, numbers, hyphens, and underscores, and be 80 characters or less.
   */
  name: string;
  /**
   * Whether the channel should be private. Defaults to false (public channel).
   */
  is_private?: boolean | undefined;
};

export interface ActionOutput_slack_createconversation {
  /**
   * The unique identifier of the channel.
   */
  id: string;
  /**
   * The normalized name of the channel.
   */
  name: string;
  /**
   * Whether the channel is private.
   */
  is_private: boolean;
  /**
   * Whether this is a channel.
   */
  is_channel: boolean;
  /**
   * Unix timestamp when the channel was created.
   */
  created: number;
  /**
   * User ID of the channel creator.
   */
  creator: string;
};

export interface ActionInput_slack_createreminder {
  /**
   * The content of the reminder. Example: "eat a banana"
   */
  text: string;
  /**
   * When the reminder should happen. Can be a Unix timestamp or natural language like "in 5 minutes", "tomorrow at 9am"
   */
  time: string | number;
  /**
   * The user ID to set the reminder for. If omitted, sets a reminder for the authenticated user. Note: Setting reminders for other users requires a bot token.
   */
  user_id?: string | undefined;
};

export interface ActionOutput_slack_createreminder {
  /**
   * The unique identifier of the reminder
   */
  id: string;
  /**
   * The user ID of the user who created the reminder
   */
  creator: string;
  /**
   * The user ID of the user the reminder is set for
   */
  user: string;
  /**
   * The content of the reminder
   */
  text: string;
  /**
   * Whether the reminder is recurring
   */
  recurring: boolean;
  /**
   * The Unix timestamp when the reminder will trigger (for non-recurring reminders)
   */
  time?: number | undefined;
  /**
   * The Unix timestamp when the reminder was completed (0 if not completed)
   */
  complete_ts?: number | undefined;
};

export interface ActionInput_slack_deletemessage {
  /**
   * Channel ID containing the message. Example: "C1234567890"
   */
  channel_id: string;
  /**
   * Timestamp of the message to delete. Example: "1405894322.002768"
   */
  message_ts: string;
};

export interface ActionOutput_slack_deletemessage {
  ok: boolean;
  channel: string;
  ts: string;
};

export interface ActionInput_slack_deletescheduledmessage {
  /**
   * The channel ID the scheduled message is posting to. Example: "C123456789"
   */
  channel: string;
  /**
   * The scheduled_message_id returned from chat.scheduleMessage. Example: "Q1234ABCD"
   */
  scheduled_message_id: string;
};

export interface ActionOutput_slack_deletescheduledmessage {
  /**
   * Whether the operation was successful
   */
  ok: boolean;
};

export interface ActionInput_slack_findmessage {
  /**
   * Search query string. Example: "pickleface"
   */
  query: string;
  /**
   * Number of results per page. Maximum 100. Default: 20
   */
  count?: number | undefined;
  /**
   * Pagination cursor from previous response. Use "*" for first page, then use next_cursor from response for subsequent pages
   */
  cursor?: string | undefined;
  /**
   * Enable query highlight markers in results. Default: false
   */
  highlight?: boolean | undefined;
  /**
   * Sort matches by score or timestamp. Default: score
   */
  sort?: 'score' | 'timestamp' | undefined;
  /**
   * Sort direction: ascending or descending. Default: desc
   */
  sort_dir?: 'asc' | 'desc' | undefined;
  /**
   * Encoded team ID to search in, required if org token is used
   */
  team_id?: string | undefined;
};

export interface ActionOutput_slack_findmessage {
  /**
   * Array of matching messages
   */
  messages: ({  /**
   * Internal ID of the message
   */
  iid: string;
  /**
   * Team ID
   */
  team: string;
  channel: {  /**
   * Channel ID
   */
  id: string;
  /**
   * Channel name
   */
  name: string;
  /**
   * Whether the channel is private
   */
  is_private: boolean;
  /**
   * Whether the channel is a multiparty IM
   */
  is_mpim: boolean;
  /**
   * Whether the channel is externally shared
   */
  is_ext_shared: boolean;
  /**
   * Whether the channel is organization shared
   */
  is_org_shared: boolean;
  /**
   * Whether the channel is shared
   */
  is_shared: boolean;
  /**
   * Whether external sharing is pending
   */
  is_pending_ext_shared: boolean;
  /**
   * List of pending shared IDs
   */
  pending_shared: string[];};
  /**
   * Message type
   */
  type: string;
  /**
   * User ID of the sender
   */
  user: string;
  /**
   * Username of the sender
   */
  username: string;
  /**
   * Message timestamp
   */
  ts: string;
  /**
   * Message text content
   */
  text: string;
  /**
   * Permanent link to the message
   */
  permalink: string;})[];
  /**
   * Total number of matching messages
   */
  total: number;
  /**
   * Pagination cursor for the next page, or null if no more results
   */
  next_cursor: string | null;
};

export interface ActionInput_slack_finduserbyemail {
  /**
   * Email address of the user to look up. Example: "user@example.com"
   */
  email: string;
};

export interface ActionOutput_slack_finduserbyemail {
  id: string;
  team_id: string;
  name: string;
  real_name: string | null;
  email: string;
  is_admin: boolean;
  is_bot: boolean;
  is_restricted: boolean;
  is_ultra_restricted: boolean;
  is_deleted: boolean;
  profile: {  avatar_hash: string | null;
  status_text: string | null;
  status_emoji: string | null;
  real_name: string | null;
  display_name: string | null;
  email: string | null;
  image_24: string | null;
  image_32: string | null;
  image_48: string | null;
  image_72: string | null;
  image_192: string | null;
  image_512: string | null;};
};

export interface ActionInput_slack_getchannelinfo {
  /**
   * Slack channel ID to retrieve information about. Example: "C012AB3CD"
   */
  channel_id: string;
};

export interface ActionOutput_slack_getchannelinfo {
  /**
   * Channel ID
   */
  id: string;
  /**
   * Channel name
   */
  name: string | null;
  /**
   * Channel topic information
   */
  topic: {  value: string;
  creator: string;
  last_set: number;} | null;
  /**
   * Channel purpose information
   */
  purpose: {  value: string;
  creator: string;
  last_set: number;} | null;
  /**
   * Whether this is a public channel
   */
  is_channel: boolean;
  /**
   * Whether this is a private channel
   */
  is_group: boolean;
  /**
   * Whether this is a direct message
   */
  is_im: boolean;
  /**
   * Whether this is a multi-person direct message
   */
  is_mpim: boolean;
  /**
   * Whether the conversation is private
   */
  is_private: boolean;
  /**
   * Whether the channel is archived
   */
  is_archived: boolean;
  /**
   * Whether this is the general channel
   */
  is_general: boolean | null;
  /**
   * Unix timestamp when the channel was created
   */
  created: number;
  /**
   * User ID of the channel creator
   */
  creator: string | null;
  /**
   * Number of members in the channel (if available)
   */
  num_members: number | null;
  /**
   * Team ID for the conversation
   */
  context_team_id: string | null;
};

export interface ActionInput_slack_getconversationhistory {
  /**
   * The conversation ID to fetch history for. Example: "C1234567890"
   */
  channel_id: string;
  /**
   * Pagination cursor from previous response. Omit for first page.
   */
  cursor?: string | undefined;
  /**
   * Only messages after this Unix timestamp will be included. Example: "1512085950.000216"
   */
  oldest?: string | undefined;
  /**
   * Only messages before this Unix timestamp will be included. Example: "1512104434.000490"
   */
  latest?: string | undefined;
  /**
   * Include messages with oldest or latest timestamps in results. Defaults to false.
   */
  inclusive?: boolean | undefined;
  /**
   * Maximum number of messages to return (max 999). Defaults to 100.
   */
  limit?: number | undefined;
};

export interface ActionOutput_slack_getconversationhistory {
  messages: ({  type: string;
  ts: string;
  user?: string | undefined;
  text?: string | undefined;
  thread_ts?: string | undefined;
  reply_count?: number | undefined;
  reactions?: ({  name: string;
  count: number;
  users: string[];})[] | undefined;
  attachments?: unknown[] | undefined;})[];
  has_more: boolean;
  next_cursor: string | null;
  pin_count?: number | undefined;
};

export interface ActionInput_slack_getdndinfo {
  /**
   * User ID to fetch DND status for. If omitted, returns status for the authenticated user. Example: "U1234567890"
   */
  user_id?: string | undefined;
};

export interface ActionOutput_slack_getdndinfo {
  /**
   * Whether Do Not Disturb is enabled
   */
  dnd_enabled: boolean;
  /**
   * Unix timestamp for the next DND window start. Null if no DND window scheduled
   */
  next_dnd_start_ts: number | null;
  /**
   * Unix timestamp for the next DND window end. Null if no DND window scheduled
   */
  next_dnd_end_ts: number | null;
  /**
   * Whether snooze mode is currently enabled
   */
  snooze_enabled: boolean;
  /**
   * Unix timestamp when snooze will end. Null if snooze is not enabled
   */
  snooze_endtime: number | null;
  /**
   * Seconds remaining until snooze ends. Null if snooze is not enabled
   */
  snooze_remaining: number | null;
  /**
   * Whether snooze is indefinite. Null if snooze is not enabled
   */
  snooze_is_indefinite: boolean | null;
};

export interface ActionInput_slack_getmessagepermalink {
  /**
   * The ID of the conversation or channel containing the message. Example: "C123ABC456"
   */
  channel_id: string;
  /**
   * The timestamp of the message, uniquely identifying it within a channel. Example: "1358546515.000008"
   */
  message_ts: string;
};

export interface ActionOutput_slack_getmessagepermalink {
  /**
   * The permalink URL for the message
   */
  permalink: string;
};

export interface ActionInput_slack_getreactions {
  /**
   * Channel ID where the message was posted. Example: "C1234567890"
   */
  channel_id: string;
  /**
   * Timestamp of the message to get reactions for. Example: "1648602352.215969"
   */
  timestamp: string;
  /**
   * If true, always return the complete reaction list.
   */
  full?: boolean | undefined;
};

export interface ActionOutput_slack_getreactions {
  /**
   * Type of the item (message, file, etc.). Example: "message"
   */
  type: string;
  /**
   * Channel ID where the message was posted
   */
  channel: string;
  message: {  type: string;
  text?: string | undefined;
  user: string;
  ts: string;
  team?: string | undefined;
  reactions?: ({  /**
   * Name of the emoji reaction. Example: "grinning"
   */
  name: string;
  /**
   * Number of users who reacted with this emoji
   */
  count: number;
  /**
   * List of user IDs who reacted with this emoji
   */
  users: string[];})[] | undefined;};
  /**
   * Permanent link to the message
   */
  permalink?: string | undefined;
};

export interface ActionInput_slack_getteaminfo {
};

export interface ActionOutput_slack_getteaminfo {
  team: {  id: string;
  name: string;
  domain: string;
  email_domain?: string | undefined;
  icon?: {  image_default?: boolean | undefined;
  image_34?: string | undefined;
  image_44?: string | undefined;
  image_68?: string | undefined;
  image_88?: string | undefined;
  image_102?: string | undefined;
  image_132?: string | undefined;
  image_230?: string | undefined;
  image_original?: string | undefined;};};
};

export interface ActionInput_slack_getthreadreplies {
  /**
   * The ID of the channel/conversation containing the thread. Example: "C1234567890"
   */
  channel_id: string;
  /**
   * The timestamp of the parent message in the thread. Example: "1234567890.123456"
   */
  thread_ts: string;
  /**
   * Pagination cursor from previous response. Omit for first page.
   */
  cursor?: string | undefined;
  /**
   * Maximum number of messages to return per page. Default: 100.
   */
  limit?: number | undefined;
};

export interface ActionOutput_slack_getthreadreplies {
  /**
   * Array of messages in the thread, including parent and replies
   */
  messages: ({  type: string;
  user: string | null;
  text: string;
  ts: string;
  thread_ts: string | null;
  reply_count?: number | undefined;
  reply_users_count?: number | undefined;
  reply_users?: string[] | undefined;})[];
  /**
   * Pagination cursor for next page. Null if no more pages.
   */
  next_cursor: string | null;
  /**
   * Whether there are more messages to fetch
   */
  has_more: boolean;
};

export interface ActionInput_slack_getuploadurl {
  /**
   * Name of the file being uploaded. Example: "document.pdf"
   */
  filename: string;
  /**
   * Size of the file in bytes. Example: 1024
   */
  length: number;
  /**
   * Description of image for screen-reader. Only applicable for image files.
   */
  alt_txt?: string | undefined;
};

export interface ActionOutput_slack_getuploadurl {
  /**
   * The URL to upload the file content to
   */
  upload_url: string;
  /**
   * The unique file ID for this upload
   */
  file_id: string;
};

export interface ActionInput_slack_getuserinfo {
  /**
   * Slack user ID. Example: "U12345678"
   */
  user_id: string;
};

export interface ActionOutput_slack_getuserinfo {
  id: string;
  team_id: string;
  name: string;
  real_name: string | null;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  is_bot: boolean;
  is_admin?: boolean | undefined;
  is_owner?: boolean | undefined;
  is_primary_owner?: boolean | undefined;
  is_restricted?: boolean | undefined;
  is_ultra_restricted?: boolean | undefined;
  is_app_user?: boolean | undefined;
  updated?: number | undefined;
};

export interface ActionInput_slack_getuserpresence {
  /**
   * User ID to get presence info on. Defaults to the authed user. Example: "U1234567890"
   */
  user_id?: string | undefined;
};

export interface ActionOutput_slack_getuserpresence {
  /**
   * User's presence status: "active" or "away"
   */
  presence: 'active' | 'away';
  /**
   * True if the user has a client currently connected to Slack
   */
  online?: boolean | undefined;
  /**
   * True if Slack servers haven't detected activity in the last 10 minutes
   */
  auto_away?: boolean | undefined;
  /**
   * True if the user has manually set their presence to away
   */
  manual_away?: boolean | undefined;
  /**
   * Count of total connections
   */
  connection_count?: number | undefined;
  /**
   * Last activity seen by Slack servers (Unix timestamp)
   */
  last_activity?: number | undefined;
};

export interface ActionInput_slack_getuserprofile {
  /**
   * User ID to get profile information for. Example: "U0123456789"
   */
  user_id: string;
};

export interface ActionOutput_slack_getuserprofile {
  id: string;
  team_id: string | null;
  name: string | null;
  real_name: string | null;
  display_name: string | null;
  email: string | null;
  profile: {  avatar_hash: string | null;
  status_text: string | null;
  status_emoji: string | null;
  status_expiration: number | null;
  real_name: string | null;
  display_name: string | null;
  real_name_normalized: string | null;
  display_name_normalized: string | null;
  email: string | null;
  title: string | null;
  phone: string | null;
  skype: string | null;
  first_name: string | null;
  last_name: string | null;
  image_original: string | null;
  image_24: string | null;
  image_32: string | null;
  image_48: string | null;
  image_72: string | null;
  image_192: string | null;
  image_512: string | null;
  team: string | null;
  fields?: unknown | undefined;};
  deleted: boolean;
  is_admin: boolean;
  is_owner: boolean;
  is_primary_owner: boolean;
  is_restricted: boolean;
  is_ultra_restricted: boolean;
  is_bot: boolean;
  is_app_user: boolean;
  has_2fa: boolean;
  tz: string | null;
  tz_label: string | null;
  tz_offset: number | null;
  updated: number | null;
};

export interface ActionInput_slack_inviteuserstoconversation {
  /**
   * The ID of the public or private channel to invite user(s) to. Example: "C024BE91L"
   */
  channel_id: string;
  /**
   * Array of user IDs to invite to the channel. Up to 1000 users may be invited at once. Example: ["U024BE7LH", "U12345678"]
   */
  user_ids: string[];
  /**
   * When set to true and multiple user IDs are provided, continue inviting the valid ones while ignoring invalid IDs. Defaults to false.
   */
  force?: boolean | undefined;
};

export interface ActionOutput_slack_inviteuserstoconversation {
  ok: boolean;
  channel?: any | undefined;
  error?: string | undefined;
};

export interface ActionInput_slack_joinchannel {
  /**
   * ID of the channel to join. Example: C061EG9SL
   */
  channel_id: string;
};

export interface ActionOutput_slack_joinchannel {
  id: string;
  name: string | null;
  is_channel?: boolean | undefined;
  is_group?: boolean | undefined;
  is_im?: boolean | undefined;
  is_private?: boolean | undefined;
  is_archived?: boolean | undefined;
  is_general?: boolean | undefined;
  created: number | null;
  creator: string | null;
  is_member?: boolean | undefined;
  num_members: number | null;
  topic?: {  value: string;
  creator: string;
  last_set: number;} | undefined;
  purpose?: {  value: string;
  creator: string;
  last_set: number;} | undefined;
};

export interface ActionInput_slack_leaveconversation {
  /**
   * The ID of the channel to leave. Example: "C1234567890"
   */
  channel_id: string;
};

export interface ActionOutput_slack_leaveconversation {
  /**
   * Whether the request was successful
   */
  ok: boolean;
  /**
   * Error message if the request failed
   */
  error: string | null;
};

export interface ActionInput_slack_listconversationmembers {
  /**
   * Slack channel ID to list members for. Example: "C0123456789"
   */
  channel_id: string;
  /**
   * Pagination cursor from previous response. Omit for first page.
   */
  cursor?: string | undefined;
  /**
   * Maximum number of items to return. Default is 100, max is 1000.
   */
  limit?: number | undefined;
};

export interface ActionOutput_slack_listconversationmembers {
  /**
   * List of user IDs belonging to the conversation members
   */
  members: string[];
  /**
   * Pagination cursor for next page, or null if no more results
   */
  next_cursor: string | null;
};

export interface ActionInput_slack_listconversations {
  /**
   * Comma-separated list of conversation types to filter by. Options: public_channel, private_channel, mpim, im. Default: public_channel.
   */
  types?: string | undefined;
  /**
   * Pagination cursor from previous response. Omit for first page.
   */
  cursor?: string | undefined;
  /**
   * Maximum number of conversations to return (1-200). Default: 100.
   */
  limit?: number | undefined;
};

export interface ActionOutput_slack_listconversations {
  conversations: ({  id: string;
  name: string;
  created: number;
  creator: string;
  is_archived: boolean;
  is_general: boolean;
  is_private: boolean;
  is_mpim: boolean;
  is_im: boolean;
  num_members?: number | undefined;})[];
  next_cursor: string | null;
  total: number;
};

export interface ActionInput_slack_listcustomemoji {
  /**
   * Include a list of categories for Unicode emoji and the emoji in each category
   */
  include_categories?: boolean | undefined;
};

export interface ActionOutput_slack_listcustomemoji {
  emoji: ({  name: string;
  type: 'custom' | 'alias';
  url: string | null;
  alias_for: string | null;})[];
  total_count: number;
};

export interface ActionInput_slack_listfiles {
  /**
   * Pagination cursor from previous response. Omit for first page.
   */
  cursor?: string | undefined;
  /**
   * Channel ID to filter files by channel. Example: "C1234567890"
   */
  channel_id?: string | undefined;
  /**
   * Maximum number of files to return per page. Default: 100. Max: 200.
   */
  limit?: number | undefined;
};

export interface ActionOutput_slack_listfiles {
  files: ({  id: string;
  name: string;
  title?: string | undefined;
  url_private?: string | undefined;
  filetype: string;
  size: number;
  created: number;
  user: string;
  channels?: string[] | undefined;})[];
  next_cursor: string | null;
  total?: number | undefined;
};

export interface ActionInput_slack_listpins {
  /**
   * The channel ID to list pinned items for. Example: "C1234567890"
   */
  channel_id: string;
};

export interface ActionOutput_slack_listpins {
  /**
   * List of pinned items in the channel
   */
  items: ({  type: 'message' | 'file' | 'file_comment';
  /**
   * Unix timestamp when the item was pinned
   */
  created: number;
  /**
   * User ID who pinned the item
   */
  created_by: string;
  /**
   * Channel ID where the item is pinned
   */
  channel: string;
  message?: {  type: string;
  user: string;
  text: string;
  ts: string;
  permalink: string;
  pinned_to?: string[] | undefined;};
  file?: {  id: string;
  created: number;
  timestamp: number;
  name?: string | undefined;
  title?: string | undefined;
  mimetype?: string | undefined;
  filetype?: string | undefined;
  user: string;
  permalink: string;};
  comment?: {  id: string;
  created: number;
  timestamp: number;
  user: string;
  comment: string;} | undefined;})[];
};

export interface ActionInput_slack_listscheduledmessages {
  /**
   * The channel ID to filter scheduled messages by. Example: "C123456789"
   */
  channel_id?: string | undefined;
  /**
   * Pagination cursor from previous response. Omit for first page.
   */
  cursor?: string | undefined;
  /**
   * Maximum number of entries to return. Default: 100
   */
  limit?: number | undefined;
  /**
   * Unix timestamp of the earliest scheduled message to include
   */
  oldest?: number | undefined;
  /**
   * Unix timestamp of the latest scheduled message to include
   */
  latest?: number | undefined;
};

export interface ActionOutput_slack_listscheduledmessages {
  messages: ({  id: string;
  channel_id: string;
  /**
   * Unix timestamp when the message will be posted
   */
  post_at: number;
  /**
   * Unix timestamp when the message was scheduled
   */
  date_created: number;
  text: string;})[];
  /**
   * Pagination cursor for next page. Null if no more pages.
   */
  next_cursor: string | null;
};

export interface ActionInput_slack_listusergroupmembers {
  /**
   * The encoded ID of the User Group. Example: "S0604QSJC"
   */
  usergroup_id: string;
};

export interface ActionOutput_slack_listusergroupmembers {
  /**
   * List of user IDs that are members of the user group
   */
  users: string[];
};

export interface ActionInput_slack_listusergroups {
  /**
   * Include results for disabled User Groups
   */
  include_disabled?: boolean | undefined;
  /**
   * Include the number of users in each User Group
   */
  include_count?: boolean | undefined;
  /**
   * Include the list of users for each User Group
   */
  include_users?: boolean | undefined;
};

export interface ActionOutput_slack_listusergroups {
  usergroups: ({  id: string;
  team_id: string;
  is_usergroup: boolean;
  name: string;
  description: string;
  handle: string;
  is_external: boolean;
  date_create: number;
  date_update: number;
  date_delete: number;
  auto_type: string | null;
  created_by: string;
  updated_by: string | null;
  deleted_by: string | null;
  prefs: {  channels: string[];
  groups: string[];};
  user_count?: number | null | undefined;
  users?: string[] | undefined;})[];
};

export interface ActionInput_slack_listuserreactions {
  /**
   * Pagination cursor from previous response. Omit for first page.
   */
  cursor?: string | undefined;
  /**
   * User ID to show reactions for. Defaults to the authenticated user.
   */
  user_id?: string | undefined;
  /**
   * Maximum number of items to return. Default is 100, max is 1000.
   */
  limit?: number | undefined;
};

export interface ActionOutput_slack_listuserreactions {
  items: any[];
  next_cursor?: any | undefined;
  total?: number | undefined;
  count?: number | undefined;
};

export interface ActionInput_slack_listusers {
  /**
   * Pagination cursor from previous response. Omit for first page.
   */
  cursor?: string | undefined;
};

export interface ActionOutput_slack_listusers {
  items: ({  id: string;
  team_id: string;
  name: string;
  deleted: boolean;
  real_name: string | null;
  profile: {  real_name: string | null;
  display_name: string | null;
  email: string | null;
  avatar_hash: string | null;
  image_24: string | null;
  image_32: string | null;
  image_48: string | null;
  image_72: string | null;
  image_192: string | null;
  image_512: string | null;};
  is_admin: boolean;
  is_owner: boolean;
  is_bot: boolean;
  updated: number;})[];
  /**
   * Pagination cursor for the next page. Null if no more pages.
   */
  next_cursor: string | null;
};

export interface ActionInput_slack_markasread {
  /**
   * The channel ID to mark as read. Example: "C02MB5ZABA7"
   */
  channel_id: string;
  /**
   * Timestamp of the message to mark as read. Example: "1234567890.123456"
   */
  message_ts: string;
};

export interface ActionOutput_slack_markasread {
  /**
   * Whether the operation succeeded
   */
  ok: boolean;
};

export interface ActionInput_slack_opendm {
  /**
   * User IDs to open a direct message with. For a 1:1 DM, provide a single user ID. For a multi-person DM, provide multiple user IDs. Example: ["U1234567890"]
   */
  user_ids: string[];
};

export interface ActionOutput_slack_opendm {
  /**
   * The ID of the opened DM channel
   */
  channel_id: string;
  /**
   * The name of the channel (for multi-person DMs this will be a generated name)
   */
  channel_name: string;
};

export interface ActionInput_slack_pinmessage {
  /**
   * Channel ID where the message was posted. Example: "C1234567890"
   */
  channel_id: string;
  /**
   * Timestamp of the message to pin. Example: "1355517523.000005"
   */
  message_timestamp: string;
};

export interface ActionOutput_slack_pinmessage {
  /**
   * Whether the pin was successfully added
   */
  ok: boolean;
};

export interface ActionInput_slack_postmessage {
  /**
   * Channel, private group, or IM channel ID to send message to. Example: "C1234567890"
   */
  channel: string;
  /**
   * Text of the message to send
   */
  text: string;
  /**
   * Timestamp of parent message to reply in thread. Example: "1234567890.123456"
   */
  thread_ts?: string | undefined;
};

export interface ActionOutput_slack_postmessage {
  /**
   * Whether the API request succeeded
   */
  ok: boolean;
  /**
   * ID of the channel the message was sent to
   */
  channel: string;
  /**
   * Timestamp of the sent message
   */
  ts: string;
  /**
   * The message object that was sent
   */
  message: {  /**
   * Message type
   */
  type: string;
  /**
   * Message subtype
   */
  subtype?: string | null | undefined;
  /**
   * Text of the message
   */
  text: string;
  /**
   * Timestamp of the message
   */
  ts: string;
  /**
   * Username of the sender
   */
  username?: string | null | undefined;
  /**
   * ID of the bot if sent by bot
   */
  bot_id?: string | null | undefined;};
};

export interface ActionInput_slack_removereaction {
  /**
   * Channel ID where the message was posted. Example: "C1234567890"
   */
  channel_id: string;
  /**
   * Timestamp of the message to remove the reaction from. Example: "1234567890.123456"
   */
  timestamp: string;
  /**
   * Name of the emoji reaction to remove. Example: "thumbsup"
   */
  reaction_name: string;
};

export interface ActionOutput_slack_removereaction {
  /**
   * Whether the operation was successful
   */
  ok: boolean;
  /**
   * Error message if the operation failed
   */
  error: string | null;
};

export interface ActionInput_slack_removeuserfromconversation {
  /**
   * The ID of the channel to remove the user from. Example: "C1234567890"
   */
  channel_id: string;
  /**
   * The ID of the user to remove from the channel. Example: "U1234567890"
   */
  user_id: string;
};

export interface ActionOutput_slack_removeuserfromconversation {
  ok: boolean;
  error?: string | null | undefined;
};

export interface ActionInput_slack_renameconversation {
  /**
   * The ID of the channel to rename. Example: "C0123456789"
   */
  channel_id: string;
  /**
   * The new name for the channel. Names must be 80 characters or less, and can only contain lowercase letters, numbers, hyphens, and underscores. Example: "general"
   */
  channel_name: string;
};

export interface ActionOutput_slack_renameconversation {
  /**
   * Channel ID
   */
  id: string;
  /**
   * Channel name
   */
  name: string;
  /**
   * Whether this is a channel
   */
  is_channel?: boolean | null | undefined;
  /**
   * Whether this is a group
   */
  is_group?: boolean | null | undefined;
  /**
   * Whether this is an IM
   */
  is_im?: boolean | null | undefined;
  /**
   * Unix timestamp when the channel was created
   */
  created?: number | null | undefined;
  /**
   * User ID of the channel creator
   */
  creator?: string | null | undefined;
  /**
   * Whether the channel is archived
   */
  is_archived?: boolean | null | undefined;
  /**
   * Whether this is the general channel
   */
  is_general?: boolean | null | undefined;
  /**
   * Whether the channel is private
   */
  is_private?: boolean | null | undefined;
  /**
   * Whether the caller is a member
   */
  is_member?: boolean | null | undefined;
  /**
   * Number of members in the channel
   */
  num_members?: number | null | undefined;
  topic?: {  value: string | null;
  creator: string | null;
  last_set: number | null;} | undefined;
  purpose?: {  value: string | null;
  creator: string | null;
  last_set: number | null;} | undefined;
};

export interface ActionInput_slack_schedulemessage {
  /**
   * The channel to post to. Example: "C02MB5ZABA7"
   */
  channel_id: string;
  /**
   * The message text to schedule
   */
  text: string;
  /**
   * Unix timestamp for when to post. Example: 1735689600
   */
  post_at: number;
  /**
   * Optional thread timestamp to post in a thread. Example: "1234567890.123456"
   */
  thread_ts?: string | undefined;
};

export interface ActionOutput_slack_schedulemessage {
  scheduled_message_id: string;
  channel: string;
  post_at: number;
};

export interface ActionInput_slack_searchfiles {
  /**
   * Search query string. Example: "report"
   */
  query: string;
  /**
   * Number of items to return per page. Max 100. Default: 20
   */
  count?: number | undefined;
  /**
   * Page number of results to return. Default: 1
   */
  page?: number | undefined;
  /**
   * Sort by score or timestamp. Default: score
   */
  sort?: 'score' | 'timestamp' | undefined;
  /**
   * Sort direction: ascending or descending. Default: desc
   */
  sort_dir?: 'asc' | 'desc' | undefined;
  /**
   * Enable query highlight markers in results. Default: false
   */
  highlight?: boolean | undefined;
};

export interface ActionOutput_slack_searchfiles {
  files: ({  id: string;
  name: string;
  title?: string | undefined;
  filetype: string;
  mimetype: string;
  user: string;
  username: string;
  created: number;
  timestamp: number;
  size: number;
  mode: string;
  is_public: boolean;
  is_external: boolean;
  external_type: string;
  editable: boolean;
  display_as_bot: boolean;
  url_private?: string | undefined;
  url_private_download?: string | undefined;
  permalink?: string | undefined;
  permalink_public?: string | undefined;
  preview: string;
  public_url_shared: boolean;
  channels: string[];
  groups: string[];
  ims: string[];
  comments_count: number;
  pretty_type: string;
  score?: string | undefined;})[];
  paging: {  count: number;
  page: number;
  pages: number;
  total: number;};
  total: number;
};

export interface ActionInput_slack_sendephemeralmessage {
  /**
   * Channel ID to send the ephemeral message to. Example: "C1234567890"
   */
  channel_id: string;
  /**
   * User ID to send the ephemeral message to. The user must be in the specified channel. Example: "U1234567890"
   */
  user_id: string;
  /**
   * Text of the message to send. Supports Slack formatting.
   */
  text: string;
  /**
   * Thread timestamp to reply to a specific thread. Example: "1234567890.123456"
   */
  thread_ts?: string | undefined;
};

export interface ActionOutput_slack_sendephemeralmessage {
  ok: boolean;
  message_ts: string;
  error?: string | undefined;
};

export interface ActionInput_slack_sendmessage {
  /**
   * Channel ID to send the message to. Example: "C1234567890"
   */
  channel_id: string;
  /**
   * Text content of the message to send. Example: "Hello world"
   */
  text: string;
};

export interface ActionOutput_slack_sendmessage {
  ok: boolean;
  channel: string;
  /**
   * Timestamp ID of the sent message
   */
  ts: string;
  message?: {  type: string;
  user: string;
  text: string;
  ts: string;
  team?: string | undefined;
  bot_id?: string | undefined;
  app_id?: string | undefined;};
};

export interface ActionInput_slack_setchannelpurpose {
  /**
   * Channel ID to set the purpose for. Example: "C1234567890"
   */
  channel_id: string;
  /**
   * The new purpose text for the channel.
   */
  purpose: string;
};

export interface ActionOutput_slack_setchannelpurpose {
  /**
   * Whether the purpose was successfully updated
   */
  success: boolean;
  /**
   * The ID of the channel that was updated
   */
  channel_id: string;
  /**
   * The new purpose that was set
   */
  purpose: string;
};

export interface ActionInput_slack_setchanneltopic {
  /**
   * The ID of the channel to set the topic for. Example: "C12345678"
   */
  channel_id: string;
  /**
   * The new topic string. Does not support formatting or linkification. Example: "Apply topically for best effects"
   */
  topic: string;
};

export interface ActionOutput_slack_setchanneltopic {
  ok: boolean;
  channel: {  [key: string]: any | undefined;};
  warning?: string | undefined;
  response_metadata?: {  [key: string]: any | undefined;};
};

export interface ActionInput_slack_setstatus {
  /**
   * The displayed text of up to 100 characters. We strongly encourage brevity.
   */
  status_text: string;
  /**
   * The displayed emoji that is enabled for the Slack team, such as `:train:` or `:coffee:`.
   */
  status_emoji: string;
  /**
   * The Unix timestamp of when the status will expire. Providing 0 or omitting this field results in a custom status that will not expire.
   */
  status_expiration?: number | undefined;
};

export interface ActionOutput_slack_setstatus {
  profile: {  title: string;
  phone: string;
  skype: string;
  real_name: string;
  real_name_normalized: string;
  display_name: string;
  display_name_normalized: string;
  status_text: string;
  status_emoji: string;
  status_emoji_display_info: any[];
  status_expiration: number;
  avatar_hash: string;
  email: string;
  pronouns: string;
  huddle_state: string;
  huddle_state_expiration_ts: number;
  first_name: string;
  last_name: string;
  image_24: string;
  image_32: string;
  image_48: string;
  image_72: string;
  image_192: string;
  image_512: string;};
};

export interface ActionInput_slack_setuserpresence {
  /**
   * User presence status. Use "online" to set presence to auto (active) or "away" to set presence to away.
   */
  presence: 'online' | 'away';
};

export interface ActionOutput_slack_setuserpresence {
  /**
   * Whether the presence was set successfully
   */
  ok: boolean;
  /**
   * Error message if the request failed
   */
  error?: string | null | undefined;
};

export interface ActionInput_slack_unarchivechannel {
  /**
   * The channel ID to unarchive. Example: "C02MB5ZABA7"
   */
  channel_id: string;
};

export interface ActionOutput_slack_unarchivechannel {
  /**
   * Whether the unarchive request was successful
   */
  ok: boolean;
};

export interface ActionInput_slack_unpinmessage {
  /**
   * The channel ID to unpin the message from. Example: "C1234567890"
   */
  channel_id: string;
  /**
   * Timestamp of the message to unpin. Example: "1234567890.123456"
   */
  timestamp: string;
};

export interface ActionOutput_slack_unpinmessage {
  /**
   * Whether the request was successful
   */
  ok: boolean;
  /**
   * Error message if the request failed
   */
  error?: string | null | undefined;
};

export interface ActionInput_slack_updatemessage {
  /**
   * The ID of the channel containing the message to update. Example: "C1234567890"
   */
  channel_id: string;
  /**
   * The timestamp of the message to update. Example: "1401383885.000061"
   */
  message_ts: string;
  /**
   * The updated text of the message. Example: "Updated message text"
   */
  text: string;
  /**
   * Pass true to update the message as the authenticated user. Bot users in this context are considered authed users. Default: true
   */
  as_user?: boolean | undefined;
  /**
   * Find and link channel names and usernames. Defaults to false. To use this, you need parse set to "full".
   */
  link_names?: boolean | undefined;
  /**
   * Change how messages are treated. Defaults to "client" which attempts to discover links. Use "none" to treat text literally, "full" for full parsing with link_names.
   */
  parse?: 'none' | 'full' | 'client' | undefined;
  /**
   * Pass false to disable unfurling of links.
   */
  unfurl_links?: boolean | undefined;
  /**
   * Pass false to disable unfurling of media content.
   */
  unfurl_media?: boolean | undefined;
  /**
   * Used to reply to a thread only and not to the channel. Pass true to reply to the channel as well.
   */
  reply_broadcast?: boolean | undefined;
  /**
   * A JSON array of blocks to use as the message content. When blocks is provided, text becomes the fallback text for notifications.
   */
  blocks?: ({})[] | undefined;
  /**
   * A JSON array of legacy attachments. Not recommended for new apps, use blocks instead.
   */
  attachments?: ({})[] | undefined;
};

export interface ActionOutput_slack_updatemessage {
  /**
   * Whether the API call was successful
   */
  ok: boolean;
  /**
   * The ID of the channel where the message was updated
   */
  channel: string;
  /**
   * The timestamp of the updated message
   */
  ts: string;
  /**
   * The updated text of the message
   */
  text: string;
  /**
   * Full message object containing updated message details
   */
  message?: any | undefined;
};
