import { createSync } from 'nango';
import { z } from 'zod';

// Pipedrive Leads API: https://developers.pipedrive.com/docs/api/v1/Leads

const LeadSchema = z.object({
    id: z.string(),
    title: z.string(),
    owner_id: z.number().optional(),
    creator_id: z.number().optional(),
    person_id: z.number().nullable().optional(),
    organization_id: z.number().nullable().optional(),
    value: z
        .object({
            amount: z.number(),
            currency: z.string()
        })
        .nullable()
        .optional(),
    expected_close_date: z.string().nullable().optional(),
    was_seen: z.boolean().optional(),
    add_time: z.string(),
    update_time: z.string(),
    channel: z.number().nullable().optional(),
    channel_id: z.string().nullable().optional(),
    origin: z.string().nullable().optional(),
    origin_id: z.string().nullable().optional()
});

// Checkpoint schema - fields must be ZodString, ZodNumber, or ZodBoolean (not wrapped in optional)
// The ZodCheckpoint type handles optionality via | undefined
const CheckpointSchema = z.object({
    updated_after: z.string(),
    start: z.number()
});

// Type for raw lead from Pipedrive API
interface PipedriveLead {
    id: string;
    title: string;
    owner_id?: number;
    creator_id?: number;
    person_id?: number | null;
    organization_id?: number | null;
    value?: { amount: number; currency: string } | null;
    expected_close_date?: string | null;
    was_seen?: boolean;
    add_time: string;
    update_time: string;
    channel?: number | null;
    channel_id?: string | null;
    origin?: string | null;
    origin_id?: string | null;
}

// Pipedrive API response structure
interface PipedriveResponse {
    success: boolean;
    data: PipedriveLead[];
    additional_data?: {
        pagination?: {
            start: number;
            limit: number;
            more_items_in_collection: boolean;
        };
    };
}

const sync = createSync<
    {
        Lead: typeof LeadSchema;
    },
    undefined,
    typeof CheckpointSchema
>({
    description: 'Sync leads from Pipedrive.',
    version: '1.0.0',
    frequency: 'every 5 minutes',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Lead: LeadSchema
    },

    endpoints: [
        {
            method: 'POST',
            path: '/syncs/leads'
        }
    ],

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const updatedAfter = checkpoint?.updated_after;
        let startOffset = checkpoint?.start ?? 0;

        let hasMore = true;
        let lastUpdateTime: string | undefined;

        while (hasMore) {
            // https://developers.pipedrive.com/docs/api/v1/Leads#getLeads
            const response = await nango.get<PipedriveResponse>({
                endpoint: '/v1/leads',
                params: {
                    sort: 'update_time ASC',
                    limit: 100,
                    start: startOffset,
                    ...(updatedAfter ? { updated_since: updatedAfter } : {})
                },
                retries: 3
            });

            const leads = response.data.data ?? [];

            if (leads.length === 0) {
                hasMore = false;
                break;
            }

            // Map and save leads
            const mappedLeads = leads.map((lead) => ({
                id: lead.id,
                title: lead.title,
                ...(lead.owner_id !== undefined && { owner_id: lead.owner_id }),
                ...(lead.creator_id !== undefined && { creator_id: lead.creator_id }),
                ...(lead.person_id !== undefined && { person_id: lead.person_id }),
                ...(lead.organization_id !== undefined && { organization_id: lead.organization_id }),
                ...(lead.value !== undefined && { value: lead.value }),
                ...(lead.expected_close_date !== undefined && { expected_close_date: lead.expected_close_date }),
                ...(lead.was_seen !== undefined && { was_seen: lead.was_seen }),
                add_time: lead.add_time,
                update_time: lead.update_time,
                ...(lead.channel !== undefined && { channel: lead.channel }),
                ...(lead.channel_id !== undefined && { channel_id: lead.channel_id }),
                ...(lead.origin !== undefined && { origin: lead.origin }),
                ...(lead.origin_id !== undefined && { origin_id: lead.origin_id })
            }));

            await nango.batchSave(mappedLeads, 'Lead');

            // We know leads is not empty here, so we can safely use non-null assertion
            lastUpdateTime = leads[leads.length - 1]!.update_time;

            // Check if there are more items
            const pagination = response.data.additional_data?.pagination;
            hasMore = pagination?.more_items_in_collection ?? false;

            if (hasMore && pagination) {
                startOffset = pagination.start + pagination.limit;

                // Keep the original filter window while resuming paginated pages.
                await nango.saveCheckpoint({
                    updated_after: updatedAfter ?? '',
                    start: startOffset
                });
            }
        }

        // After processing all pages, update the checkpoint with the last update_time
        // to start from there on the next sync run
        if (lastUpdateTime) {
            await nango.saveCheckpoint({
                updated_after: lastUpdateTime,
                start: 0
            });
        }

        // Handle deleted/archived leads
        // https://developers.pipedrive.com/docs/api/v1/Leads#getArchivedLeads
        if (updatedAfter) {
            let deletedHasMore = true;
            let deletedStartOffset = 0;
            const deletedLeads: { id: string }[] = [];

            while (deletedHasMore) {
                const deletedResponse = await nango.get<{
                    success: boolean;
                    data: Array<{ id: string }>;
                    additional_data?: {
                        pagination?: {
                            start: number;
                            limit: number;
                            more_items_in_collection: boolean;
                        };
                    };
                }>({
                    endpoint: '/v1/leads/archived',
                    params: {
                        sort: 'update_time ASC',
                        updated_since: updatedAfter,
                        limit: 100,
                        start: deletedStartOffset
                    },
                    retries: 3
                });

                const page = deletedResponse.data.data ?? [];

                if (page.length > 0) {
                    deletedLeads.push(...page.map((lead) => ({ id: lead.id })));
                }

                const pagination = deletedResponse.data.additional_data?.pagination;
                deletedHasMore = pagination?.more_items_in_collection ?? false;

                if (deletedHasMore && pagination) {
                    deletedStartOffset = pagination.start + pagination.limit;
                }
            }

            if (deletedLeads.length > 0) {
                await nango.batchDelete(deletedLeads, 'Lead');
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
