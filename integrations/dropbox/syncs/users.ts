import { createSync } from 'nango';
import type { DropboxUserResponse, DropboxUser } from '../types.js';

import type { ProxyConfiguration } from 'nango';
import { User } from '../models.js';
import { z } from 'zod';

const sync = createSync({
    description: 'Fetches a list of users from Dropbox. Requires Dropbox Business.',
    version: '2.0.0',
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

    scopes: ['members.read'],

    models: {
        User: User
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const config: ProxyConfiguration = {
            // https://www.dropbox.com/developers/documentation/http/teams#team-members-list
            endpoint: `/2/team/members/list_v2`,
            data: {},
            retries: 10
        };

        const response = await nango.post<DropboxUserResponse>(config);

        const { data } = response;

        const { members } = data;
        let hasMore = data.has_more;
        let cursor = data.cursor;

        const users: User[] = members.map((member: DropboxUser) => {
            return {
                id: member.profile.account_id,
                firstName: member.profile.name.given_name,
                lastName: member.profile.name.surname,
                email: member.profile.email
            };
        });

        await nango.batchSave(users, 'User');

        while (hasMore) {
            const userConfig: ProxyConfiguration = {
                // https://www.dropbox.com/developers/documentation/http/teams#team-members-list/continue
                endpoint: `/2/team/members/list/continue`,
                data: {
                    cursor
                },
                retries: 10
            };

            const response = await nango.post<DropboxUserResponse>(userConfig);

            const { data } = response;

            const { members } = data;
            hasMore = data.has_more;
            cursor = data.cursor;

            const users: User[] = members.map((member: DropboxUser) => {
                return {
                    id: member.profile.account_id,
                    firstName: member.profile.name.given_name,
                    lastName: member.profile.name.surname,
                    email: member.profile.email
                };
            });

            await nango.batchSave(users, 'User');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
