import { createSync } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { HackerRankWorkTeam } from '../models.js';
import { z } from 'zod';

const sync = createSync({
    description: 'Fetches a list of teams from hackerrank work',
    version: '2.0.0',
    frequency: 'every 6 hours',
    autoStart: true,
    syncType: 'incremental',
    trackDeletes: false,

    endpoints: [
        {
            method: 'GET',
            path: '/teams'
        }
    ],

    models: {
        HackerRankWorkTeam: HackerRankWorkTeam
    },

    metadata: z.object({}),

    exec: async (nango) => {
        let totalRecords = 0;

        const config: ProxyConfiguration = {
            // https://www.hackerrank.com/work/apidocs#!/Teams/get_x_api_v3_teams_limit_limit_offset_offset
            endpoint: '/x/api/v3/teams',
            paginate: {
                type: 'link',
                limit_name_in_request: 'limit',
                link_path_in_response_body: 'next',
                response_path: 'data',
                limit: 100
            }
        };

        const lastSyncDate = nango.lastSyncDate;
        for await (const team of nango.paginate(config)) {
            const teamsToSave = [];
            for (const item of team) {
                if (lastSyncDate !== undefined && new Date(item.created_at) < lastSyncDate) {
                    continue; // Skip teams created before lastSyncDate
                }
                const mappedTeam: HackerRankWorkTeam = mapTeam(item);

                totalRecords++;
                teamsToSave.push(mappedTeam);
            }

            if (teamsToSave.length > 0) {
                await nango.batchSave(teamsToSave, 'HackerRankWorkTeam');
                await nango.log(`Saving batch of ${teamsToSave.length} team(s) (total team(s): ${totalRecords})`);
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;

function mapTeam(team: any): HackerRankWorkTeam {
    return {
        id: team.id,
        name: team.name,
        created_at: team.created_at,
        owner: team.owner,
        recruiter_count: team.recruiter_count,
        developer_count: team.developer_count,
        interviewer_count: team.interviewer_count,
        recruiter_cap: team.recruiter_cap,
        developer_cap: team.developer_cap,
        interviewer_cap: team.interviewer_cap,
        logo_id: team.logo_id,
        library_access: team.library_access,
        invite_as: team.invite_as,
        locations: team.locations,
        departments: team.departments
    };
}
