export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
};

export interface OrganizationalUnit {
  id: string;
  name: string;
  createdAt: string | null;
  deletedAt: string | null;
  description: string | null;
  path: string | null;
  parentPath: string | null;
  parentId: string | null;
};

export interface SyncMetadata_microsoft_teams_messages {
  orgsToSync: string[];
  channelsLastSyncDate?: {} | undefined;
  chatsLastSyncDate?: {} | undefined;
};

export interface TeamsMessage {
  id: string;
  channelId: string | null;
  chatId: string | null;
  content: string | null;
  createdDateTime: string;
  lastModifiedDateTime: string | null;
  deletedDateTime: string | null;
  from: {  user: {  id: string | null;
  displayName: string | null;
  email: string | null;};};
  importance: string | null;
  messageType: string;
  subject: string | null;
  webUrl: string | null;
  attachments: ({  id: string;
  contentType: string;
  contentUrl: string | null;
  name: string | null;
  thumbnailUrl: string | null;})[] | null;
  reactions: ({  reactionType: string;
  createdDateTime: string;
  user: {  id: string;
  displayName: string | null;
  email: string | null;};})[] | null;
  replies: ({  id: string;
  content: string | null;
  createdDateTime: string;
  from: {  user: {  id: string | null;
  displayName: string | null;
  email: string | null;};};})[] | null;
  raw_json: string;
};

export interface SyncMetadata_microsoft_teams_orgunits {
};

export interface SyncMetadata_microsoft_teams_users {
  orgsToSync: string[];
  channelsLastSyncDate?: {} | undefined;
  chatsLastSyncDate?: {} | undefined;
};
