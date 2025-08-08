import { createSync } from 'nango';
import type { SlackUserResponse } from '../types.js';

import type { ProxyConfiguration } from 'nango';
import { SlackUser } from '../models.js';
import { z } from 'zod';

const sync = createSync({
    description: 'Syncs information about all Users on the Slack workspace',
    version: '2.0.0',
    frequency: 'every hour',
    autoStart: true,
    syncType: 'full',
    trackDeletes: false,

    endpoints: [
        {
            method: 'GET',
            path: '/users'
        }
    ],

    scopes: ['users:read', 'users:read.email'],

    models: {
        SlackUser: SlackUser
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const config: ProxyConfiguration = {
            // https://api.slack.com/methods/users.list
            endpoint: 'users.list',
            retries: 10,
            params: {
                limit: '200'
            },
            paginate: {
                response_path: 'members'
            }
        };

        for await (const slackUsers of nango.paginate<SlackUserResponse>(config)) {
            const users: SlackUser[] = slackUsers.map((record) => {
                return {
                    id: record.id,
                    team_id: record.team_id,
                    name: record.name,
                    deleted: record.deleted,
                    tz: record.tz,
                    tz_label: record.tz_label,
                    tz_offset: record.tz_offset,
                    profile: {
                        avatar_hash: record.profile.avatar_hash,
                        real_name: record.profile.real_name ? record.profile.real_name : null,
                        display_name: record.profile.display_name ? record.profile.display_name : null,
                        real_name_normalized: record.profile.real_name_normalized ? record.profile.real_name_normalized : null,
                        display_name_normalized: record.profile.display_name_normalized ? record.profile.display_name_normalized : null,
                        email: record.profile.email ? record.profile.email : null,
                        image_original: record.profile.is_custom_image ? record.profile.image_original : null
                    },
                    is_admin: record.is_admin,
                    is_owner: record.is_owner,
                    is_primary_owner: record.is_primary_owner,
                    is_restricted: record.is_restricted,
                    is_ultra_restricted: record.is_ultra_restricted,
                    is_bot: record.is_bot,
                    updated: record.updated,
                    is_app_user: record.is_app_user,
                    raw_json: JSON.stringify(record)
                };
            });
            await nango.batchSave(users, 'SlackUser');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
