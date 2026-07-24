import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    type: z.enum(['call', 'interview', 'meeting']).optional().describe('Filter by event type.'),
    start_date: z.string().optional().describe('Return events scheduled after this date. Example: "2024-01-01T00:00:00Z" .'),
    end_date: z.string().optional().describe('Return events scheduled before this date. Example: "2024-12-31T23:59:59Z" .'),
    candidate_id: z.string().optional().describe('Filter events for a specific candidate. Example: "27273038" .'),
    shortcode: z.string().optional().describe('Filter events for a specific job shortcode. Example: "9CD658E13E" .'),
    member_id: z.string().optional().describe('Filter events for a specific member. Example: "1f395d" .'),
    context: z.enum(['user', 'team', 'all']).optional().describe("Source of events. 'all' and 'team' require a user token."),
    include_cancelled: z.boolean().optional().describe('When true, includes cancelled events.'),
    limit: z.number().int().min(1).max(100).optional().describe('Number of events to retrieve per page (max 100).'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const ProviderMemberSchema = z.object({
    id: z.string(),
    name: z.string(),
    status: z.string()
});

const ProviderJobSchema = z.object({
    shortcode: z.string(),
    title: z.string()
});

const ProviderCandidateSchema = z.object({
    id: z.string(),
    name: z.string()
});

const ProviderConferenceSchema = z.object({
    type: z.string(),
    id: z.union([z.string(), z.number()]),
    url: z.string()
});

const ProviderEventSchema = z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().nullable().optional(),
    type: z.string(),
    starts_at: z.string(),
    ends_at: z.string(),
    cancelled: z.boolean().optional(),
    job: ProviderJobSchema.nullable().optional(),
    members: z.array(ProviderMemberSchema).optional(),
    candidate: ProviderCandidateSchema.nullable().optional(),
    conference: ProviderConferenceSchema.nullable().optional()
});

const ProviderResponseSchema = z.object({
    events: z.array(ProviderEventSchema),
    paging: z
        .object({
            next: z.string().optional()
        })
        .optional()
});

const OutputSchema = z.object({
    events: z.array(
        z.object({
            id: z.string(),
            title: z.string(),
            description: z.string().optional(),
            type: z.string(),
            starts_at: z.string(),
            ends_at: z.string(),
            cancelled: z.boolean().optional(),
            job: z
                .object({
                    shortcode: z.string(),
                    title: z.string()
                })
                .optional(),
            members: z
                .array(
                    z.object({
                        id: z.string(),
                        name: z.string(),
                        status: z.string()
                    })
                )
                .optional(),
            candidate: z
                .object({
                    id: z.string(),
                    name: z.string()
                })
                .optional(),
            conference: z
                .object({
                    type: z.string(),
                    id: z.union([z.string(), z.number()]),
                    url: z.string()
                })
                .optional()
        })
    ),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List scheduled recruiting events (calls, interviews, meetings).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['r_jobs'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {
            ...(input.type !== undefined && { type: input.type }),
            ...(input.start_date !== undefined && { start_date: input.start_date }),
            ...(input.end_date !== undefined && { end_date: input.end_date }),
            ...(input.candidate_id !== undefined && { candidate_id: input.candidate_id }),
            ...(input.shortcode !== undefined && { shortcode: input.shortcode }),
            ...(input.member_id !== undefined && { member_id: input.member_id }),
            ...(input.context !== undefined && { context: input.context }),
            ...(input.include_cancelled !== undefined && { include_cancelled: String(input.include_cancelled) }),
            ...(input.limit !== undefined && { limit: input.limit }),
            ...(input.cursor !== undefined && { since_id: input.cursor })
        };

        const config: ProxyConfiguration = {
            // https://workable.readme.io/reference/events
            endpoint: '/spi/v3/events',
            params,
            retries: 3
        };

        const response = await nango.get(config);

        const providerResponse = ProviderResponseSchema.parse(response.data);

        const events = providerResponse.events.map((event) => ({
            id: event.id,
            title: event.title,
            ...(event.description != null && { description: event.description }),
            type: event.type,
            starts_at: event.starts_at,
            ends_at: event.ends_at,
            ...(event.cancelled !== undefined && { cancelled: event.cancelled }),
            ...(event.job != null && { job: event.job }),
            ...(event.members != null && { members: event.members }),
            ...(event.candidate != null && { candidate: event.candidate }),
            ...(event.conference != null && { conference: event.conference })
        }));

        let nextCursor: string | undefined;
        if (providerResponse.paging?.next) {
            const nextUrl = new URL(providerResponse.paging.next);
            const sinceId = nextUrl.searchParams.get('since_id');
            if (sinceId) {
                nextCursor = sinceId;
            }
        }

        return {
            events,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
