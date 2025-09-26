import { createSync } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { WorkableMember } from '../models.js';
import { z } from 'zod';

const sync = createSync({
    description: 'Fetches a list of account members from workable',
    version: '1.0.0',
    frequency: 'every 6 hours',
    autoStart: true,
    syncType: 'full',

    endpoints: [
        {
            method: 'GET',
            path: '/workable/members'
        }
    ],

    scopes: ['r_jobs'],

    models: {
        WorkableMember: WorkableMember
    },

    metadata: z.object({}),

    exec: async (nango) => {
        let totalRecords = 0;

        const config: ProxyConfiguration = {
            // https://workable.readme.io/reference/members
            endpoint: '/spi/v3/members',
            paginate: {
                type: 'link',
                link_path_in_response_body: 'paging.next',
                limit_name_in_request: 'limit',
                response_path: 'members',
                limit: 100
            }
        };
        for await (const member of nango.paginate(config)) {
            const mappedMember: WorkableMember[] = member.map(mapMember) || [];

            const batchSize: number = mappedMember.length;
            totalRecords += batchSize;
            await nango.log(`Saving batch of ${batchSize} members (total members: ${totalRecords})`);
            await nango.batchSave(mappedMember, 'WorkableMember');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;

function mapMember(member: any): WorkableMember {
    return {
        id: member.id,
        name: member.name,
        headline: member.headline,
        email: member.email,
        role: member.role
    };
}
