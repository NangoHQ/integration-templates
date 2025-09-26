import { createSync } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { LeverPosting } from '../models.js';
import { z } from 'zod';

const LIMIT = 100;

const sync = createSync({
    description: 'Fetches a list of all postings in Lever',
    version: '2.0.0',
    frequency: 'every 6 hours',
    autoStart: true,
    syncType: 'full',

    endpoints: [
        {
            method: 'GET',
            path: '/postings',
            group: 'Postings'
        }
    ],

    scopes: ['postings:read:admin'],

    models: {
        LeverPosting: LeverPosting
    },

    metadata: z.object({}),

    exec: async (nango) => {
        let totalRecords = 0;

        const config: ProxyConfiguration = {
            // https://hire.lever.co/developer/documentation#list-all-postings
            endpoint: '/v1/postings',
            paginate: {
                type: 'cursor',
                cursor_path_in_response: 'next',
                cursor_name_in_request: 'offset',
                limit_name_in_request: 'limit',
                response_path: 'data',
                limit: LIMIT
            }
        };
        for await (const posting of nango.paginate(config)) {
            const mappedPosting: LeverPosting[] = posting.map(mapPosting) || [];

            const batchSize: number = mappedPosting.length;
            totalRecords += batchSize;
            await nango.log(`Saving batch of ${batchSize} posting(s) (total posting(s): ${totalRecords})`);
            await nango.batchSave(mappedPosting, 'LeverPosting');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;

function mapPosting(posting: any): LeverPosting {
    return {
        id: posting.id,
        text: posting.text,
        createdAt: posting.createdAt,
        updatedAt: posting.updatedAt,
        user: posting.user,
        owner: posting.owner,
        hiringManager: posting.hiringManager,
        confidentiality: posting.confidentiality,
        categories: posting.categories,
        content: posting.content,
        country: posting.country,
        followers: posting.followers,
        tags: posting.tags,
        state: posting.state,
        distributionChannels: posting.distributionChannels,
        reqCode: posting.reqCode,
        requisitionCodes: posting.requisitionCodes,
        salaryDescription: posting.salaryDescription,
        salaryDescriptionHtml: posting.salaryDescriptionHtml,
        salaryRange: posting.salaryRange,
        urls: posting.urls,
        workplaceType: posting.workplaceType
    };
}
