export interface ListUserTagsResponse {
    '@xmlns': string;
    ListUserTagsResult: ListUserTagsResult;
    ResponseMetadata: ResponseMetadata;
}

interface ListUserTagsResult {
    IsTruncated: boolean;
    Tags: Tags[];
    Marker?: string;
}

interface Tags {
    member: TagMember[];
}

export interface TagMember {
    Key: string;
    Value: string;
}

interface ResponseMetadata {
    RequestId: string;
}

export interface AWSIAMRequestParams {
    method: string;
    service: string;
    path: string;
    params: Record<string, string>;
}

export interface ListUsersResponse {
    '@xmlns': string;
    ListUsersResult: ListUsersResult;
    ResponseMetadata: ResponseMetadata;
}

interface ListUsersResult {
    Users: AWSIAMUser[];
    IsTruncated: boolean;
    Marker?: string;
}

export interface AWSIAMUser {
    UserId: string;
    Path: string;
    UserName: string;
    Arn: string;
    CreateDate: string;
    PasswordLastUsed?: string;
}

interface ResponseMetadata {
    RequestId: string;
}

export interface CreateUserResponse {
    CreateUserResult: CreateUserResult;
    ResponseMetadata: ResponseMetadata;
}

interface CreateUserResult {
    User: User;
}

interface User {
    Arn: string;
    CreateDate: number;
    PasswordLastUsed: number | null;
    Path: string;
    PermissionsBoundary: string | null;
    Tags: Tag[] | null;
    UserId: string;
    UserName: string;
}

interface Tag {
    Key: string;
    Value: string;
}
