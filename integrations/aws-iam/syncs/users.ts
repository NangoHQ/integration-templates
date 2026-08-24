import { createSync } from 'nango';
import { getAWSAuthHeader } from '../helper/utils.js';
import type { AWSIAMRequestParams, TagMember } from '../types.js';
import type { ProxyConfiguration } from 'nango';
import { User } from '../models.js';
import { z } from 'zod';

const CheckpointSchema = z.object({
    marker: z.string()
});

const ListUsersResponseSchema = z.object({
    ListUsersResponse: z.object({
        ListUsersResult: z.object({
            Users: z.array(
                z.object({
                    UserId: z.string(),
                    Path: z.string(),
                    UserName: z.string(),
                    Arn: z.string(),
                    CreateDate: z.string(),
                    PasswordLastUsed: z.string().optional()
                })
            ),
            IsTruncated: z.boolean(),
            Marker: z.string().optional()
        })
    })
});

const ListUserTagsResultSchema = z.object({
    ListUserTagsResponse: z.object({
        ListUserTagsResult: z.object({
            Tags: z.union([
                z.array(
                    z.union([
                        z.object({ Key: z.string(), Value: z.string() }),
                        z.object({
                            member: z.union([z.array(z.object({ Key: z.string(), Value: z.string() })), z.object({ Key: z.string(), Value: z.string() })])
                        })
                    ])
                ),
                z.union([
                    z.object({ Key: z.string(), Value: z.string() }),
                    z.object({
                        member: z.union([z.array(z.object({ Key: z.string(), Value: z.string() })), z.object({ Key: z.string(), Value: z.string() })])
                    })
                ])
            ]),
            IsTruncated: z.boolean(),
            Marker: z.string().optional()
        })
    })
});

const sync = createSync({
    description: 'Fetches a list of users from AWS IAM',
    version: '1.1.0',
    frequency: 'every day',
    autoStart: true,
    syncType: 'full',

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

    checkpoint: CheckpointSchema,

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        let nextMarker: string | undefined;
        if (rawCheckpoint != null) {
            const checkpointParse = CheckpointSchema.safeParse(rawCheckpoint);
            if (!checkpointParse.success) {
                throw new Error(`Invalid checkpoint: ${checkpointParse.error.message}`);
            }
            nextMarker = checkpointParse.data.marker || undefined;
        }

        await nango.trackDeletesStart('User');

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
                // https://docs.aws.amazon.com/IAM/latest/APIReference/API_ListUsers.html
                endpoint: '/',
                params: queryParams,
                headers: {
                    Authorization: authorizationHeader,
                    'x-amz-date': date
                },
                retries: 10
            };

            const response = await nango.get(config);
            const parsed = ListUsersResponseSchema.safeParse(response.data);
            if (!parsed.success) {
                throw new Error(`Invalid ListUsers response: ${parsed.error.message}`);
            }

            const listUsersResult = parsed.data.ListUsersResponse.ListUsersResult;
            const awsUsers = listUsersResult.Users;
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

            if (listUsersResult.IsTruncated && !listUsersResult.Marker) {
                throw new Error('ListUsers response is truncated but missing Marker');
            }
            nextMarker = listUsersResult.IsTruncated ? listUsersResult.Marker : undefined;

            if (nextMarker) {
                await nango.saveCheckpoint({ marker: nextMarker });
            }
        } while (nextMarker);

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('User');
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
    let nextMarker: string | undefined;

    // https://docs.aws.amazon.com/IAM/latest/APIReference/API_ListUserTags.html
    do {
        const queryParams: Record<string, string> = {
            ...requestParams.params,
            ...(nextMarker ? { Marker: nextMarker } : {})
        };

        const sortedQueryParams = new Map(Object.entries(queryParams).sort());
        const querystring = new URLSearchParams(Array.from(sortedQueryParams)).toString();

        const { authorizationHeader, date } = await getAWSAuthHeader(nango, requestParams.method, requestParams.service, requestParams.path, querystring);
        const config: ProxyConfiguration = {
            // https://docs.aws.amazon.com/IAM/latest/APIReference/API_ListUserTags.html
            endpoint: '/',
            params: queryParams,
            headers: {
                Authorization: authorizationHeader,
                'x-amz-date': date
            },
            retries: 10
        };

        const response = await nango.get(config);
        const parsed = ListUserTagsResultSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new Error(`Invalid ListUserTags response: ${parsed.error.message}`);
        }

        const listUserTagsResult = parsed.data.ListUserTagsResponse.ListUserTagsResult;
        const rawTags = listUserTagsResult.Tags;
        const tagItems = Array.isArray(rawTags) ? rawTags : [rawTags];
        for (const item of tagItems) {
            if ('Key' in item) {
                tags.push(item);
            } else {
                const member = item.member;
                const members = Array.isArray(member) ? member : [member];
                tags.push(...members);
            }
        }

        if (listUserTagsResult.IsTruncated && !listUserTagsResult.Marker) {
            throw new Error('ListUserTags response is truncated but missing Marker');
        }
        nextMarker = listUserTagsResult.IsTruncated ? listUserTagsResult.Marker : undefined;
    } while (nextMarker);

    return tags;
}
