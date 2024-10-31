import type { NangoSync, ProxyConfiguration, User } from '../../models';
import { getAWSAuthHeader } from '../helper/utils.js';
import type { AWSIAMRequestParams, AWSIAMUser, TagMember, ListUsersResponse, ListUserTagsResponse } from '../types';

export default async function fetchData(nango: NangoSync) {
    const method = 'GET';
    const service = 'iam';
    const path = '/';
    const params = {
        Action: 'ListUsers',
        Version: '2010-05-08'
    };

    // Set AWS IAM parameters
    const requestParams: AWSIAMRequestParams = {
        method,
        service,
        path,
        params
    };

    // https://docs.aws.amazon.com/IAM/latest/APIReference/API_ListUsers.html
    for await (const awsUsers of paginate<AWSIAMUser>(nango, requestParams)) {
        const users: User[] = [];

        for (const user of awsUsers) {
            const tags = await fetchUserTags(nango, user.UserName);
            const firstName = tags.find((tag) => tag.Key === 'firstName')?.Value || '';
            const lastName = tags.find((tag) => tag.Key === 'lastName')?.Value || '';
            const email = tags.find((tag) => tag.Key === 'email')?.Value || '';

            users.push({
                id: user.UserId,
                firstName,
                lastName,
                email
            });
        }

        await nango.batchSave(users, 'User');
    }
}

async function fetchUserTags(nango: NangoSync, userName: string): Promise<TagMember[]> {
    const requestParams: AWSIAMRequestParams = {
        method: 'GET',
        service: 'iam',
        path: '/',
        params: {
            Action: 'ListUserTags',
            Version: '2010-05-08',
            UserName: userName
        }
    };

    const tags: TagMember[] = [];
    // https://docs.aws.amazon.com/IAM/latest/APIReference/API_ListUserTags.html
    for await (const response of paginate<TagMember>(nango, requestParams)) {
        tags.push(...response);
    }

    return tags;
}

async function* paginate<T>(nango: NangoSync, requestParams: AWSIAMRequestParams): AsyncGenerator<T[], void, undefined> {
    let nextMarker: string | undefined;

    do {
        const { method, service, path, params } = requestParams;
        const queryParams: Record<string, string> = {
            ...params,
            ...(nextMarker ? { Marker: nextMarker } : {})
        };

        // Sort and construct query string
        const sortedQueryParams = new Map(Object.entries(queryParams).sort());
        const querystring = new URLSearchParams(Array.from(sortedQueryParams)).toString();

        // Authorization header setup
        const { authorizationHeader, date } = await getAWSAuthHeader(nango, method, service, path, querystring);
        const config: ProxyConfiguration = {
            baseUrlOverride: 'https://iam.amazonaws.com',
            endpoint: '/',
            params: queryParams,
            headers: {
                Authorization: authorizationHeader,
                'x-amz-date': date
            },
            retries: 10
        };

        const response = await nango.get<{
            ListUsersResponse?: ListUsersResponse;
            ListUserTagsResponse?: ListUserTagsResponse;
        }>(config);

        // Handle ListUsersResponse
        if (response.data.ListUsersResponse?.ListUsersResult) {
            const listUsersResult = response.data.ListUsersResponse.ListUsersResult;
            const users = listUsersResult.Users;
            yield users as T[];
            nextMarker = listUsersResult.IsTruncated ? listUsersResult.Marker : undefined;
        }

        // Handle ListUserTagsResponse
        if (response.data.ListUserTagsResponse?.ListUserTagsResult) {
            const listUserTagsResult = response.data.ListUserTagsResponse.ListUserTagsResult;
            const tags = listUserTagsResult.Tags;
            yield tags as T[];
            nextMarker = listUserTagsResult.IsTruncated ? listUserTagsResult.Marker : undefined;
        }
    } while (nextMarker);
}
