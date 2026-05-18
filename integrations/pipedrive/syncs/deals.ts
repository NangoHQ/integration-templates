import { createSync } from 'nango';
import { z } from 'zod';
import type { ProxyConfiguration } from 'nango';

// Raw provider response schema - matches Pipedrive API v2 response
const PipedriveDealSchema = z.object({
    id: z.number(),
    title: z.string(),
    value: z.number().nullable().optional(),
    currency: z.string().nullable().optional(),
    add_time: z.string().optional(),
    update_time: z.string(),
    stage_id: z.number().nullable().optional(),
    pipeline_id: z.number().nullable().optional(),
    status: z.string().optional(),
    user_id: z
        .object({
            id: z.number(),
            name: z.string().optional(),
            email: z.string().optional()
        })
        .nullable()
        .optional(),
    person_id: z
        .object({
            id: z.number(),
            name: z.string().optional(),
            email: z.array(z.object({ value: z.string(), primary: z.boolean() })).optional()
        })
        .nullable()
        .optional(),
    org_id: z
        .object({
            id: z.number(),
            name: z.string().optional()
        })
        .nullable()
        .optional(),
    probability: z.number().nullable().optional(),
    lost_reason: z.string().nullable().optional(),
    close_time: z.string().nullable().optional(),
    visible_to: z.union([z.number(), z.string()]).nullable().optional()
});

// Normalized model schema for Nango sync
const DealSchema = z.object({
    id: z.string(),
    title: z.string(),
    value: z.number().optional(),
    currency: z.string().optional(),
    add_time: z.string().optional(),
    update_time: z.string(),
    stage_id: z.number().optional(),
    pipeline_id: z.number().optional(),
    status: z.string().optional(),
    user_id: z.number().optional(),
    user_name: z.string().optional(),
    person_id: z.number().optional(),
    person_name: z.string().optional(),
    org_id: z.number().optional(),
    org_name: z.string().optional(),
    probability: z.number().optional(),
    lost_reason: z.string().optional(),
    close_time: z.string().optional(),
    visible_to: z.union([z.number(), z.string()]).optional()
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const sync = createSync({
    description: 'Sync deals from Pipedrive.',
    version: '2.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/deals'
        }
    ],
    checkpoint: CheckpointSchema,
    models: {
        Deal: DealSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();

        // https://developers.pipedrive.com/docs/api/v1/Deals#getDeals
        const proxyConfig: ProxyConfiguration = {
            // https://developers.pipedrive.com/docs/api/v1/Deals#getDeals
            endpoint: '/v1/deals',
            params: {
                sort_by: 'update_time',
                sort_direction: 'asc',
                ...(checkpoint?.updated_after && { updated_since: checkpoint.updated_after })
            },
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'cursor',
                cursor_path_in_response: 'additional_data.next_cursor',
                response_path: 'data',
                limit_name_in_request: 'limit',
                limit: 100
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const deals = page
                .map((rawDeal: unknown) => {
                    const parsed = PipedriveDealSchema.safeParse(rawDeal);
                    if (!parsed.success) {
                        return null;
                    }
                    const deal = parsed.data;
                    return {
                        id: String(deal.id),
                        title: deal.title,
                        ...(deal.value !== null && deal.value !== undefined && { value: deal.value }),
                        ...(deal.currency !== null && deal.currency !== undefined && deal.currency !== '' && { currency: deal.currency }),
                        ...(deal.add_time !== undefined && { add_time: deal.add_time }),
                        update_time: deal.update_time,
                        ...(deal.stage_id !== null && deal.stage_id !== undefined && { stage_id: deal.stage_id }),
                        ...(deal.pipeline_id !== null && deal.pipeline_id !== undefined && { pipeline_id: deal.pipeline_id }),
                        ...(deal.status !== undefined && { status: deal.status }),
                        ...(deal.user_id?.id !== undefined && { user_id: deal.user_id.id }),
                        ...(deal.user_id?.name !== undefined && { user_name: deal.user_id.name }),
                        ...(deal.person_id?.id !== undefined && { person_id: deal.person_id.id }),
                        ...(deal.person_id?.name !== undefined && { person_name: deal.person_id.name }),
                        ...(deal.org_id?.id !== undefined && { org_id: deal.org_id.id }),
                        ...(deal.org_id?.name !== undefined && { org_name: deal.org_id.name }),
                        ...(deal.probability !== null && deal.probability !== undefined && { probability: deal.probability }),
                        ...(deal.lost_reason !== null && deal.lost_reason !== undefined && deal.lost_reason !== '' && { lost_reason: deal.lost_reason }),
                        ...(deal.close_time !== null && deal.close_time !== undefined && { close_time: deal.close_time }),
                        ...(deal.visible_to !== null && deal.visible_to !== undefined && { visible_to: deal.visible_to })
                    };
                })
                .filter((deal): deal is NonNullable<typeof deal> => deal !== null);

            if (deals.length === 0) {
                continue;
            }

            await nango.batchSave(deals, 'Deal');

            const lastDeal = deals[deals.length - 1];
            if (lastDeal) {
                await nango.saveCheckpoint({
                    updated_after: lastDeal.update_time
                });
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
