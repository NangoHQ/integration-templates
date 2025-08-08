import { createSync } from 'nango';
import { getAWSAuthHeader } from '../helper/utils.js';
import type { AWSIAMRequestParams, AWSIAMUser, TagMember, ListUsersResponse, ListUserTagsResponse } from '../types.js';

import type { ProxyConfiguration } from 'nango';
import { User } from '../models.js';
import { z } from 'zod';

const sync = createSync({
    description: 'Fetches a list of users from AWS IAM',
    version: '1.0.0',
    frequency: 'every day',
    autoStart: true,
    syncType: 'full',
    trackDeletes: true,

    endpoints: [
        {
            method: 'GET',
            path: '/users',
            group: 'Users'
        }
    ],

    models: {
        User: User
    },

    metadata: z.object({}),

    exec: async (nango) => {
        // Set AWS IAM parameters
        const requestParams: AWSIAMRequestParams = {
            method: 'GET',
            service: 'iam',
            path: '/',
            params: {
                Action: 'ListUsers',
                Version: '2010-05-08'
            }
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
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;

async function fetchUserTags(nango: NangoSyncLocal, userName: string): Promise<TagMember[]> {
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

async function* paginate<T>(nango: NangoSyncLocal, requestParams: AWSIAMRequestParams): AsyncGenerator<T[], void, undefined> {
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
            // see docs in calling functions
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
            // eslint-disable-next-line @nangohq/custom-integrations-linting/no-object-casting
            yield users as T[];
            nextMarker = listUsersResult.IsTruncated ? listUsersResult.Marker : undefined;
        }

        // Handle ListUserTagsResponse
        if (response.data.ListUserTagsResponse?.ListUserTagsResult) {
            const listUserTagsResult = response.data.ListUserTagsResponse.ListUserTagsResult;
            const tags = listUserTagsResult.Tags;
            // eslint-disable-next-line @nangohq/custom-integrations-linting/no-object-casting
            yield tags as T[];
            nextMarker = listUserTagsResult.IsTruncated ? listUserTagsResult.Marker : undefined;
        }
    } while (nextMarker);
}
