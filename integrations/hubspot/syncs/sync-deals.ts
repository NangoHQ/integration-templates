import { createSync } from 'nango';
import { z } from 'zod';

const DealSchema = z.object({
    id: z.string(),
    name: z.union([z.string(), z.null()]),
    amount: z.union([z.number(), z.null()]),
    close_date: z.union([z.string(), z.null()]),
    stage: z.union([z.string(), z.null()]),
    owner_id: z.union([z.string(), z.null()]),
    description: z.union([z.string(), z.null()]),
    company_ids: z.array(z.string()),
    contact_ids: z.array(z.string()),
    updated_at: z.string()
});

const CheckpointSchema = z.object({
    after: z.string()
});

type Checkpoint = z.infer<typeof CheckpointSchema>;

const sync = createSync({
    description: 'Sync deals with amount, close date, stage, owner, description, and associated companies and contacts',
    version: '1.0.0',
    endpoints: [{ method: 'GET', path: '/syncs/sync-deals', group: 'Deals' }],
    frequency: 'every 5 minutes',
    autoStart: true,
    checkpoint: CheckpointSchema,

    models: {
        Deal: DealSchema
    },

    exec: async (nango) => {
        const checkpoint = (await nango.getCheckpoint()) as Checkpoint | null;
        let after = checkpoint?.after || undefined;

        while (true) {
            const response = await nango.get<{
                results?: any[];
                paging?: { next?: { after?: string } };
            }>({
                // https://developers.hubspot.com/docs/api-reference/crm-deals-v3/guide
                endpoint: '/crm/v3/objects/deals',
                params: {
                    properties: 'dealname,amount,closedate,dealstage,hubspot_owner_id,description,hs_lastmodifieddate',
                    limit: '100',
                    ...(after && { after })
                },
                retries: 3
            });

            const dealsResponse = response.data.results ?? [];
            if (dealsResponse.length === 0) {
                break;
            }

            const deals: z.infer<typeof DealSchema>[] = [];

            for (const deal of dealsResponse) {
                const dealId = deal.id;

                // Fetch associated companies
                // https://developers.hubspot.com/docs/reference/api/crm/associations/associations
                let companyIds: string[] = [];
                try {
                    const companiesResponse = await nango.get({
                        endpoint: `/crm/v3/objects/deals/${dealId}/associations/companies`,
                        retries: 3
                    });
                    companyIds = companiesResponse.data?.results?.map((assoc: any) => assoc.id) || [];
                } catch (e) {
                    // Associations may not exist, continue without them
                }

                // Fetch associated contacts
                let contactIds: string[] = [];
                try {
                    const contactsResponse = await nango.get({
                        endpoint: `/crm/v3/objects/deals/${dealId}/associations/contacts`,
                        retries: 3
                    });
                    contactIds = contactsResponse.data?.results?.map((assoc: any) => assoc.id) || [];
                } catch (e) {
                    // Associations may not exist, continue without them
                }

                const record: z.infer<typeof DealSchema> = {
                    id: dealId,
                    name: deal.properties?.['dealname'] ?? null,
                    amount: deal.properties?.['amount'] ? parseFloat(deal.properties['amount']) : null,
                    close_date: deal.properties?.['closedate'] ?? null,
                    stage: deal.properties?.['dealstage'] ?? null,
                    owner_id: deal.properties?.['hubspot_owner_id'] ?? null,
                    description: deal.properties?.['description'] ?? null,
                    company_ids: companyIds,
                    contact_ids: contactIds,
                    updated_at: deal.properties?.['hs_lastmodifieddate'] ?? deal.updatedAt ?? new Date().toISOString()
                };

                deals.push(record);
            }

            if (deals.length > 0) {
                await nango.batchSave(deals, 'Deal');
            }

            const nextAfter = response.data.paging?.next?.after;
            if (nextAfter) {
                after = nextAfter;
                await nango.saveCheckpoint({
                    after
                });
                continue;
            }

            break;
        }

        await nango.clearCheckpoint();
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
