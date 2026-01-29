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
  channel_id: string;
  message_ts: string;
  reaction_name: string;
};

export interface ActionOutput_slack_addreaction {
  ok: boolean;
};

export interface ActionInput_slack_archivechannel {
  channel_id: string;
};

export interface ActionOutput_slack_archivechannel {
  ok: boolean;
};

export interface ActionInput_slack_createchannel {
  name: string;
  is_private?: boolean | undefined;
};

export interface ActionOutput_slack_createchannel {
  ok: boolean;
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
  channel_id: string;
  message_ts: string;
};

export interface ActionOutput_slack_deletemessage {
  ok: boolean;
  ts: string;
  channel: string;
};

export interface ActionInput_slack_getchannelinfo {
  channel_id: string;
};

export interface ActionOutput_slack_getchannelinfo {
  ok: boolean;
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
  channel_id: string;
  limit?: number | undefined;
  cursor?: string | undefined;
};

export interface ActionOutput_slack_getchannelmembers {
  ok: boolean;
  members: string[];
  response_metadata?: {  next_cursor?: string | undefined;};
};

export interface ActionInput_slack_getconversationhistory {
  channel_id: string;
  limit?: number | undefined;
  cursor?: string | undefined;
  oldest_ts?: string | undefined;
  latest_ts?: string | undefined;
};

export interface ActionOutput_slack_getconversationhistory {
  ok: boolean;
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
  has_more: boolean;
  next_cursor: string | null;
};

export interface ActionInput_slack_getdndinfo {
  user_id?: string | undefined;
};

export interface ActionOutput_slack_getdndinfo {
  ok: boolean;
  dnd_enabled: boolean;
  next_dnd_start_ts: number;
  next_dnd_end_ts: number;
};

export interface ActionInput_slack_getfileinfo {
  file: string;
};

export interface ActionOutput_slack_getfileinfo {
  ok: boolean;
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
  channel_id: string;
  message_ts: string;
};

export interface ActionOutput_slack_getreactions {
  ok: boolean;
  type?: string | undefined;
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
  ok: boolean;
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
  channel_id: string;
  thread_ts: string;
  limit?: number | undefined;
  cursor?: string | undefined;
};

export interface ActionOutput_slack_getthreadreplies {
  ok: boolean;
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
  has_more: boolean;
  next_cursor: string | null;
};

export interface ActionInput_slack_getuploadurl {
  filename: string;
  length: number;
};

export interface ActionOutput_slack_getuploadurl {
  ok: boolean;
  upload_url: string;
  file_id: string;
};

export interface ActionInput_slack_getuserinfo {
  user_id: string;
};

export interface ActionOutput_slack_getuserinfo {
  ok: boolean;
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
  user_id: string;
};

export interface ActionOutput_slack_getuserpresence {
  ok: boolean;
  presence: string;
};

export interface ActionInput_slack_getuserprofile {
  user_id?: string | undefined;
};

export interface ActionOutput_slack_getuserprofile {
  ok: boolean;
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
  channel_id: string;
  user_ids: string;
};

export interface ActionOutput_slack_invitetochannel {
  ok: boolean;
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
  channel_id: string;
};

export interface ActionOutput_slack_joinchannel {
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
  channel_id: string;
};

export interface ActionOutput_slack_leavechannel {
  ok: boolean;
};

export interface ActionInput_slack_listchannels {
  types?: string | undefined;
  limit?: number | undefined;
  cursor?: string | undefined;
};

export interface ActionOutput_slack_listchannels {
  ok: boolean;
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
  next_cursor: string | null;
};

export interface ActionInput_slack_listcustomemoji {
};

export interface ActionOutput_slack_listcustomemoji {
  ok: boolean;
  emoji: {  [key: string]: string;};
};

export interface ActionInput_slack_listfiles {
  channel_id?: string | undefined;
  user_id?: string | undefined;
  types?: string | undefined;
  count?: number | undefined;
  page?: number | undefined;
};

export interface ActionOutput_slack_listfiles {
  ok: boolean;
  files: ({  id: string;
  name: string | null;
  title: string | null;
  mimetype: string | null;
  filetype: string | null;
  size: number | null;
  created: number | null;
  timestamp: number | null;})[];
  paging: {  count: number;
  total: number;
  page: number;
  pages: number;};
};

export interface ActionInput_slack_listpins {
  channel_id: string;
};

export interface ActionOutput_slack_listpins {
  ok: boolean;
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
  channel_id?: string | undefined;
  latest_ts?: number | undefined;
  oldest_ts?: number | undefined;
};

export interface ActionOutput_slack_listscheduledmessages {
  ok: boolean;
  scheduled_messages: ({  id: string;
  channel_id: string;
  post_at: number;
  date_created: number;
  text?: string | undefined;})[];
};

export interface ActionInput_slack_listusergroupmembers {
  usergroup: string;
};

export interface ActionOutput_slack_listusergroupmembers {
  ok: boolean;
  users: string[];
};

export interface ActionInput_slack_listusergroups {
  include_disabled?: boolean | undefined;
  include_count?: boolean | undefined;
};

export interface ActionOutput_slack_listusergroups {
  ok: boolean;
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
  limit?: number | undefined;
  cursor?: string | undefined;
};

export interface ActionOutput_slack_listuserreactions {
  ok: boolean;
  items: ({  type: string;
  channel?: string | undefined;
  message?: {  type: string;
  text?: string | undefined;
  user?: string | undefined;
  ts?: string | undefined;
  reactions?: ({  name: string;
  users: string[];
  count: number;})[] | undefined;};})[];
  response_metadata: {  next_cursor?: string | undefined;};
};

export interface ActionInput_slack_listusers {
  limit?: number | undefined;
  cursor?: string | undefined;
};

export interface ActionOutput_slack_listusers {
  ok: boolean;
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
  response_metadata: {  next_cursor?: string | undefined;};
};

export interface ActionInput_slack_lookupuserbyemail {
  email: string;
};

export interface ActionOutput_slack_lookupuserbyemail {
  ok: boolean;
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
  channel_id: string;
  message_ts: string;
};

export interface ActionOutput_slack_markasread {
  ok: boolean;
};

export interface ActionInput_slack_opendm {
  users: string;
  return_im?: boolean | undefined;
};

export interface ActionOutput_slack_opendm {
  ok: boolean;
  channel: {  id: string;};
};

export interface ActionInput_slack_pinmessage {
  channel_id: string;
  message_ts: string;
};

export interface ActionOutput_slack_pinmessage {
  ok: boolean;
};

export interface ActionInput_slack_postmessage {
  channel_id: string;
  text: string;
  thread_ts?: string | undefined;
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
  ok: boolean;
  ts: string;
  channel: string;
  message: {  text: string;
  type: string;
  user: string;};
};

export interface ActionInput_slack_removefromchannel {
  channel_id: string;
  user_id: string;
};

export interface ActionOutput_slack_removefromchannel {
  ok: boolean;
};

export interface ActionInput_slack_removereaction {
  channel_id: string;
  message_ts: string;
  reaction_name: string;
};

export interface ActionOutput_slack_removereaction {
  ok: boolean;
};

export interface ActionInput_slack_renamechannel {
  channel_id: string;
  channel_name: string;
};

export interface ActionOutput_slack_renamechannel {
  ok: boolean;
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
  channel_id: string;
  text: string;
  post_at: number;
  thread_ts?: string | undefined;
};

export interface ActionOutput_slack_schedulemessage {
  ok: boolean;
  scheduled_message_id: string;
  post_at: number;
};

export interface ActionInput_slack_searchfiles {
  query: string;
  count?: number | undefined;
  page?: number | undefined;
  sort?: 'score' | 'timestamp' | undefined;
  sort_dir?: 'asc' | 'desc' | undefined;
};

export interface ActionOutput_slack_searchfiles {
  ok: boolean;
  files: {  total: number;
  matches: ({  id: string;
  name: string;
  title: string;
  mimetype: string;
  filetype: string;
  size: number;
  url_private: string;
  permalink: string;
  timestamp: number;})[];
  pagination: {  total_count: number;
  page: number;
  per_page: number;
  page_count: number;
  first: number;
  last: number;};};
};

export interface ActionInput_slack_searchmessages {
  query: string;
  count?: number | undefined;
  page?: number | undefined;
  sort?: 'score' | 'timestamp' | undefined;
  sort_dir?: 'asc' | 'desc' | undefined;
};

export interface ActionOutput_slack_searchmessages {
  ok: boolean;
  messages: {  total: number;
  matches: ({  type: string;
  ts: string;
  text: string;
  channel: {  id: string;
  name: string;};
  user: string | null;
  username: string | null;
  permalink: string;})[];
  pagination: {  total_count: number;
  page: number;
  per_page: number;
  page_count: number;
  first: number;
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
  channel_id: string;
  purpose: string;
};

export interface ActionOutput_slack_setchannelpurpose {
  ok: boolean;
  purpose: string;
};

export interface ActionInput_slack_setchanneltopic {
  channel_id: string;
  topic: string;
};

export interface ActionOutput_slack_setchanneltopic {
  ok: boolean;
  topic: string;
};

export interface ActionInput_slack_setuserpresence {
  presence: string;
};

export interface ActionOutput_slack_setuserpresence {
  ok: boolean;
};

export interface ActionInput_slack_unarchivechannel {
  channel_id: string;
};

export interface ActionOutput_slack_unarchivechannel {
  ok: boolean;
};

export interface ActionInput_slack_unpinmessage {
  channel_id: string;
  message_ts: string;
};

export interface ActionOutput_slack_unpinmessage {
  ok: boolean;
};

export interface ActionInput_slack_updatemessage {
  channel_id: string;
  message_ts: string;
  text?: string | undefined;
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
  ok: boolean;
  ts: string;
  channel: string;
  text: string;
};
