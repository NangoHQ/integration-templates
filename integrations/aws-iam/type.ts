export interface ListUserTagsResponse {
    '@xmlns': string; // XML namespace
    ListUserTagsResult: ListUserTagsResult;
    ResponseMetadata: ResponseMetadata;
}

interface ListUserTagsResult {
    IsTruncated: boolean;
    Tags: Tags;
}

interface Tags {
    member: TagMember[];
}

export interface TagMember {
    Key: string;
    Value: string
}

interface ResponseMetadata {
    RequestId: string;
}
