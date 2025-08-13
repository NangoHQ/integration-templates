import { createSync } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { HackerRankWorkUser } from '../models.js';
import { z } from 'zod';

const sync = createSync({
    description: 'Fetches a list of users from hackerrank work',
    version: '2.0.0',
    frequency: 'every 6 hours',
    autoStart: true,
    syncType: 'incremental',
    trackDeletes: false,

    endpoints: [
        {
            method: 'GET',
            path: '/users'
        }
    ],

    models: {
        HackerRankWorkUser: HackerRankWorkUser
    },

    metadata: z.object({}),

    exec: async (nango) => {
        let totalRecords = 0;

        const config: ProxyConfiguration = {
            // https://www.hackerrank.com/work/apidocs#!/UserMembership/get_x_api_v3_teams_team_id_users_limit_limit_offset_offset
            endpoint: '/x/api/v3/users',
            paginate: {
                type: 'link',
                limit_name_in_request: 'limit',
                link_path_in_response_body: 'next',
                response_path: 'data',
                limit: 100
            }
        };

        const lastSyncDate = nango.lastSyncDate;
        for await (const user of nango.paginate(config)) {
            const usersToSave = [];
            for (const item of user) {
                if (lastSyncDate !== undefined && new Date(item.created_at) < lastSyncDate) {
                    continue; // Skip users created before lastSyncDate
                }
                const mappedUser: HackerRankWorkUser = mapUser(item);

                totalRecords++;
                usersToSave.push(mappedUser);
            }

            if (usersToSave.length > 0) {
                await nango.batchSave(usersToSave, 'HackerRankWorkUser');
                await nango.log(`Saving batch of ${usersToSave.length} user(s) (total user(s): ${totalRecords})`);
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;

function mapUser(user: any): HackerRankWorkUser {
    return {
        id: user.id,
        email: user.email,
        firstname: user.firstname,
        lastname: user.lastname,
        country: user.country,
        role: user.role,
        status: user.status,
        phone: user.phone,
        timezone: user.timezone,
        questions_permission: user.questions_permission,
        tests_permission: user.tests_permission,
        interviews_permission: user.interviews_permission,
        candidates_permission: user.candidates_permission,
        shared_questions_permission: user.shared_questions_permission,
        shared_tests_permission: user.shared_tests_permission,
        shared_interviews_permission: user.shared_interviews_permission,
        shared_candidates_permission: user.shared_candidates_permission,
        created_at: user.created_at,
        company_admin: user.company_admin,
        team_admin: user.team_admin,
        company_id: user.company_id,
        teams: user.teams,
        activated: user.activated,
        last_activity_time: user.last_activity_time
    };
}
