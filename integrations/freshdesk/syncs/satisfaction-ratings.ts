import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderSatisfactionRatingSchema = z.object({
    id: z.number().int(),
    survey_id: z.number().int().optional(),
    ticket_id: z.number().int().optional(),
    user_id: z.number().int().optional(),
    agent_id: z.number().int().optional(),
    group_id: z.number().int().nullable().optional(),
    rating: z.number().int().optional(),
    feedback: z.string().nullable().optional(),
    created_at: z.string(),
    updated_at: z.string()
});

const SatisfactionRatingSchema = z
    .object({
        id: z.string().describe('Unique identifier of the satisfaction rating.'),
        survey_id: z.string().optional().describe('ID of the associated satisfaction survey.'),
        ticket_id: z.string().optional().describe('ID of the ticket that was rated.'),
        user_id: z.string().optional().describe('ID of the user who provided the rating.'),
        agent_id: z.string().optional().describe('ID of the agent who handled the ticket.'),
        group_id: z.string().optional().describe('ID of the group assigned to the ticket.'),
        rating: z.number().int().optional().describe('Numeric satisfaction score submitted by the customer.'),
        feedback: z.string().optional().describe('Written feedback text submitted by the customer.'),
        created_at: z.string().describe('UTC timestamp when the rating was created.'),
        updated_at: z.string().describe('UTC timestamp when the rating was last updated.')
    })
    .describe('A customer satisfaction rating submitted for a Freshdesk ticket.');

type SatisfactionRating = z.infer<typeof SatisfactionRatingSchema>;

const CheckpointSchema = z
    .object({
        created_after: z.string().describe('ISO timestamp to filter ratings created since the last sync.')
    })
    .describe('Checkpoint used to resume incremental sync of satisfaction ratings.');

const sync = createSync({
    description: 'Sync ticket satisfaction ratings from Freshdesk.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        SatisfactionRating: SatisfactionRatingSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const createdAfter = checkpoint?.created_after;
        let lastProcessedCreatedAt: string | undefined;

        const proxyConfig: ProxyConfiguration = {
            // https://developers.freshdesk.com/api/#view_all_satisfaction_ratings
            endpoint: '/api/v2/surveys/satisfaction_ratings',
            params: createdAfter ? { created_since: createdAfter } : {},
            paginate: {
                type: 'offset',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'per_page',
                limit: 100
            },
            retries: 3
        };

        for await (const pageResults of nango.paginate(proxyConfig)) {
            const ratings: SatisfactionRating[] = pageResults.map((item: unknown) => {
                const parsed = ProviderSatisfactionRatingSchema.safeParse(item);
                if (!parsed.success) {
                    throw new Error(`Failed to parse satisfaction rating: ${parsed.error.message}`);
                }

                const data = parsed.data;
                return {
                    id: String(data.id),
                    ...(data.survey_id !== undefined && { survey_id: String(data.survey_id) }),
                    ...(data.ticket_id !== undefined && { ticket_id: String(data.ticket_id) }),
                    ...(data.user_id !== undefined && { user_id: String(data.user_id) }),
                    ...(data.agent_id !== undefined && { agent_id: String(data.agent_id) }),
                    ...(data.group_id != null && { group_id: String(data.group_id) }),
                    ...(data.rating !== undefined && { rating: data.rating }),
                    ...(data.feedback != null && { feedback: data.feedback }),
                    created_at: data.created_at,
                    updated_at: data.updated_at
                };
            });

            if (ratings.length === 0) {
                continue;
            }

            await nango.batchSave(ratings, 'SatisfactionRating');
            const lastRating = ratings[ratings.length - 1];
            if (!lastRating) {
                continue;
            }
            lastProcessedCreatedAt = lastRating.created_at;

            if (lastProcessedCreatedAt) {
                await nango.saveCheckpoint({
                    created_after: lastProcessedCreatedAt
                });
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
