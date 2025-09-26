import { createSync } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { LeverOpportunityOffer } from '../models.js';
import { z } from 'zod';

const LIMIT = 100;

const sync = createSync({
    description: 'Fetches a list of all offers for every single opportunity',
    version: '2.0.0',
    frequency: 'every 6 hours',
    autoStart: true,
    syncType: 'full',

    endpoints: [
        {
            method: 'GET',
            path: '/offers',
            group: 'Offers'
        }
    ],

    scopes: ['offers:write:admin'],

    models: {
        LeverOpportunityOffer: LeverOpportunityOffer
    },

    metadata: z.object({}),

    exec: async (nango) => {
        let totalRecords = 0;

        const opportunities: any[] = await getAllOpportunities(nango);

        for (const opportunity of opportunities) {
            const config: ProxyConfiguration = {
                // https://hire.lever.co/developer/documentation#list-all-offers
                endpoint: `/v1/opportunities/${opportunity.id}/offers`,
                paginate: {
                    type: 'cursor',
                    cursor_path_in_response: 'next',
                    cursor_name_in_request: 'offset',
                    limit_name_in_request: 'limit',
                    response_path: 'data',
                    limit: LIMIT
                }
            };
            for await (const offer of nango.paginate(config)) {
                const mappedOffer: LeverOpportunityOffer[] = offer.map(mapOffer) || [];
                // Save offers
                const batchSize: number = mappedOffer.length;
                totalRecords += batchSize;
                await nango.log(`Saving batch of ${batchSize} offer(s) for opportunity ${opportunity.id} (total offers: ${totalRecords})`);
                await nango.batchSave(mappedOffer, 'LeverOpportunityOffer');
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;

async function getAllOpportunities(nango: NangoSyncLocal) {
    const records: any[] = [];
    const config: ProxyConfiguration = {
        // https://hire.lever.co/developer/documentation#list-all-opportunities
        endpoint: '/v1/opportunities',
        paginate: {
            type: 'cursor',
            cursor_path_in_response: 'next',
            cursor_name_in_request: 'offset',
            limit_name_in_request: 'limit',
            response_path: 'data',
            limit: LIMIT
        }
    };

    for await (const recordBatch of nango.paginate(config)) {
        records.push(...recordBatch);
    }

    return records;
}

function mapOffer(offer: any): LeverOpportunityOffer {
    return {
        id: offer.id,
        createdAt: offer.createdAt,
        status: offer.status,
        creator: offer.creator,
        fields: offer.fields,
        sentDocument: offer.sentDocument,
        signedDocument: offer.signedDocument
    };
}
