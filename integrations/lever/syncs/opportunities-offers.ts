import { createSync } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

const LIMIT = 100;

const LeverOfferFieldSchema = z.object({
    text: z.string(),
    identifier: z.string(),
    value: z.union([z.string(), z.number()]).nullable()
});

const LeverOfferDocumentSchema = z.object({
    fileName: z.string(),
    uploadedAt: z.number(),
    downloadUrl: z.string()
});

const LeverOpportunityOfferSchema = z.object({
    id: z.string(),
    createdAt: z.number(),
    status: z.string(),
    creator: z.string(),
    fields: z.array(LeverOfferFieldSchema),
    sentDocument: LeverOfferDocumentSchema.nullable(),
    signedDocument: LeverOfferDocumentSchema.nullable()
});

const LeverOpportunitySchema = z.object({
    id: z.string()
});

type LeverOpportunityOffer = z.infer<typeof LeverOpportunityOfferSchema>;
type LeverOpportunity = z.infer<typeof LeverOpportunitySchema>;

const sync = createSync({
    description: 'Fetches a list of all offers for every single opportunity',
    version: '3.0.0',
    frequency: 'every 6 hours',
    autoStart: true,
    scopes: ['offers:write:admin'],
    models: {
        LeverOpportunityOffer: LeverOpportunityOfferSchema
    },
    metadata: z.object({}),

    exec: async (nango) => {
        let totalRecords = 0;

        const opportunities = await getAllOpportunities(nango);

        for (const opportunity of opportunities) {
            const config: ProxyConfiguration = {
                // https://hire.lever.co/developer/documentation#list-all-offers
                endpoint: `/v1/opportunities/${encodeURIComponent(opportunity.id)}/offers`,
                paginate: {
                    type: 'cursor',
                    cursor_path_in_response: 'next',
                    cursor_name_in_request: 'offset',
                    limit_name_in_request: 'limit',
                    response_path: 'data',
                    limit: LIMIT
                },
                retries: 3
            };

            for await (const offerBatch of nango.paginate(config)) {
                const offers = z.array(z.unknown()).parse(offerBatch);
                const mappedOffers: LeverOpportunityOffer[] = [];

                for (const offer of offers) {
                    const parsedOffer = LeverOpportunityOfferSchema.safeParse(offer);
                    if (!parsedOffer.success) {
                        throw new Error(`Failed to parse offer: ${parsedOffer.error.message}`);
                    }
                    mappedOffers.push(parsedOffer.data);
                }

                const batchSize = mappedOffers.length;
                totalRecords += batchSize;
                await nango.log(`Saving batch of ${batchSize} offer(s) for opportunity ${opportunity.id} (total offers: ${totalRecords})`);
                await nango.batchSave(mappedOffers, 'LeverOpportunityOffer');
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;

async function getAllOpportunities(nango: NangoSyncLocal) {
    const records: LeverOpportunity[] = [];

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
        },
        retries: 3
    };

    for await (const recordBatch of nango.paginate(config)) {
        const batch = z.array(z.unknown()).parse(recordBatch);
        for (const record of batch) {
            const parsed = LeverOpportunitySchema.safeParse(record);
            if (!parsed.success) {
                throw new Error(`Failed to parse opportunity: ${parsed.error.message}`);
            }
            records.push(parsed.data);
        }
    }

    return records;
}
