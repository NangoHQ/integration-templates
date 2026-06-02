import { createSync } from 'nango';
import { z } from 'zod';

const ProviderDealSchema = z.object({
    id: z.string(),
    owner: z.string().optional(),
    contact: z.string().optional(),
    organization: z.string().nullable().optional(),
    group: z.string().optional(),
    stage: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    percent: z.string().optional(),
    cdate: z.string().optional(),
    mdate: z.string().optional(),
    nextdate: z.string().nullable().optional(),
    nexttaskid: z.string().nullable().optional(),
    value: z.string().optional(),
    currency: z.string().optional(),
    winProbability: z.number().nullable().optional(),
    winProbabilityMdate: z.string().nullable().optional(),
    status: z.string().optional(),
    activitycount: z.string().optional(),
    nextdealid: z.string().optional(),
    edate: z.string().nullable().optional(),
    hash: z.string().optional(),
    isDisabled: z.union([z.boolean(), z.number()]).optional(),
    account: z.string().nullable().optional(),
    customerAccount: z.string().nullable().optional()
});

const DealSchema = z.object({
    id: z.string(),
    owner: z.string().optional(),
    contact: z.string().optional(),
    organization: z.string().optional(),
    group: z.string().optional(),
    stage: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    percent: z.string().optional(),
    cdate: z.string().optional(),
    mdate: z.string().optional(),
    nextdate: z.string().optional(),
    nexttaskid: z.string().optional(),
    value: z.string().optional(),
    currency: z.string().optional(),
    winProbability: z.number().optional(),
    winProbabilityMdate: z.string().optional(),
    status: z.string().optional(),
    activitycount: z.string().optional(),
    nextdealid: z.string().optional(),
    edate: z.string().optional(),
    hash: z.string().optional(),
    isDisabled: z.boolean().optional(),
    account: z.string().optional(),
    customerAccount: z.string().optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string(),
    created_after: z.string(),
    offset: z.number().int().nonnegative()
});

const LegacyCheckpointSchema = z.object({
    updated_after: z.string()
});

const ProviderResponseSchema = z.object({
    deals: z.array(z.unknown()).optional()
});

const sync = createSync({
    description: 'Sync deals from ActiveCampaign.',
    version: '1.0.0',
    endpoints: [{ method: 'GET', path: '/syncs/deals' }],
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Deal: DealSchema
    },

    exec: async (nango) => {
        const checkpointRaw = await nango.getCheckpoint();
        const checkpointResult = CheckpointSchema.safeParse(checkpointRaw);
        const legacyCheckpointResult = LegacyCheckpointSchema.safeParse(checkpointRaw);
        const updatedAfter = checkpointResult.success
            ? checkpointResult.data.updated_after
            : legacyCheckpointResult.success
              ? legacyCheckpointResult.data.updated_after
              : '1970-01-01T00:00:00.000Z';
        const syncStartTime = new Date().toISOString();
        let createdAfter = checkpointResult.success ? checkpointResult.data.created_after : '';
        let currentOffset = checkpointResult.success ? checkpointResult.data.offset : 0;

        while (true) {
            const response = await nango.get({
                // https://developers.activecampaign.com/reference/list-all-deals
                endpoint: '/3/deals',
                params: {
                    'filters[updated_after]': updatedAfter,
                    'orders[cdate]': 'ASC',
                    ...(createdAfter ? { 'filters[created_after]': createdAfter } : {}),
                    limit: 100,
                    offset: currentOffset
                },
                retries: 3
            });

            const providerDeals = z.array(ProviderDealSchema).parse(ProviderResponseSchema.parse(response.data).deals ?? []);
            if (providerDeals.length === 0) {
                break;
            }

            const deals = providerDeals.map((deal) => {
                return {
                    id: deal.id,
                    ...(deal.owner !== undefined && { owner: deal.owner }),
                    ...(deal.contact !== undefined && { contact: deal.contact }),
                    ...(deal.organization !== undefined && deal.organization !== null && { organization: deal.organization }),
                    ...(deal.group !== undefined && { group: deal.group }),
                    ...(deal.stage !== undefined && { stage: deal.stage }),
                    ...(deal.title !== undefined && { title: deal.title }),
                    ...(deal.description !== undefined && { description: deal.description }),
                    ...(deal.percent !== undefined && { percent: deal.percent }),
                    ...(deal.cdate !== undefined && { cdate: deal.cdate }),
                    ...(deal.mdate !== undefined && { mdate: deal.mdate }),
                    ...(deal.nextdate !== undefined && deal.nextdate !== null && { nextdate: deal.nextdate }),
                    ...(deal.nexttaskid !== undefined && deal.nexttaskid !== null && { nexttaskid: deal.nexttaskid }),
                    ...(deal.value !== undefined && { value: deal.value }),
                    ...(deal.currency !== undefined && { currency: deal.currency }),
                    ...(deal.winProbability !== undefined && deal.winProbability !== null && { winProbability: deal.winProbability }),
                    ...(deal.winProbabilityMdate !== undefined && deal.winProbabilityMdate !== null && { winProbabilityMdate: deal.winProbabilityMdate }),
                    ...(deal.status !== undefined && { status: deal.status }),
                    ...(deal.activitycount !== undefined && { activitycount: deal.activitycount }),
                    ...(deal.nextdealid !== undefined && { nextdealid: deal.nextdealid }),
                    ...(deal.edate !== undefined && deal.edate !== null && { edate: deal.edate }),
                    ...(deal.hash !== undefined && { hash: deal.hash }),
                    ...(deal.isDisabled !== undefined && { isDisabled: Boolean(deal.isDisabled) }),
                    ...(deal.account !== undefined && deal.account !== null && { account: deal.account }),
                    ...(deal.customerAccount !== undefined && deal.customerAccount !== null && { customerAccount: deal.customerAccount })
                };
            });

            if (deals.length === 0) {
                break;
            }

            await nango.batchSave(deals, 'Deal');

            const lastCreatedAt = providerDeals[providerDeals.length - 1]?.cdate;
            if (lastCreatedAt != null) {
                const lastCreatedAtCount = providerDeals.filter((deal) => deal.cdate === lastCreatedAt).length;
                if (lastCreatedAt === createdAfter) {
                    currentOffset += providerDeals.length;
                } else {
                    createdAfter = lastCreatedAt;
                    currentOffset = lastCreatedAtCount;
                }
            } else {
                currentOffset += providerDeals.length;
            }

            await nango.saveCheckpoint({
                updated_after: updatedAfter,
                created_after: createdAfter,
                offset: currentOffset
            });

            if (providerDeals.length < 100) {
                break;
            }
        }

        await nango.saveCheckpoint({
            updated_after: syncStartTime,
            created_after: '',
            offset: 0
        });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
