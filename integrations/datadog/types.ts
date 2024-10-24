interface UserAttributes {
  created_at: string;
  disabled: boolean;
  email: string;
  handle: string;
  icon: string;
  mfa_enabled: boolean;
  modified_at: string;
  name: string;
  service_account: boolean;
  status: string;
  title: string;
  verified: boolean;
}

interface RelationshipData {
  id: string;
  type: string;
}

interface UserRelationships {
  org: { data: RelationshipData };
  other_orgs: { data: RelationshipData[] };
  other_users: { data: RelationshipData[] };
  roles: { data: RelationshipData[] };
}

export interface DatadogUser {
  attributes: UserAttributes;
  id: string;
  relationships: UserRelationships;
  type: string;
}

interface OrgAttributes {
  created_at: string;
  description: string;
  disabled: boolean;
  modified_at: string;
  name: string;
  public_id: string;
  sharing: string;
  url: string;
}

interface Org {
  attributes: OrgAttributes;
  id: string;
  type: string;
}

export interface DatadogCreateUserResponse {
  data: DatadogUser;
  included: Org[];
}
