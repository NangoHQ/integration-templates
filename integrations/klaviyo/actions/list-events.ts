import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    metric_id: z.string().optional().describe('Filter by metric ID. Example: "abc123"'),
    profile_id: z.string().optional().describe('Filter by profile ID. Example: "01KWFX4MZPQDSD3YG79C83CBDV"'),
    datetime: z.string().optional().describe('Filter by datetime. Example: "2024-01-01T00:00:00Z"'),
    include: z
        .array(z.enum(['metric', 'profile']))
        .optional()
        .describe('Relationships to include in the response.')
});

const ProviderResponseSchema = z.object({
    data: z.array(z.unknown()).optional(),
    included: z.array(z.unknown()).optional(),
    links: z
        .object({
            next: z.string().optional().nullable()
        })
        .optional()
});

const OutputSchema = z.object({
    data: z.array(z.unknown()).optional(),
    included: z.array(z.unknown()).optional(),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List events.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['events:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | string[]> = {};

        if (input.cursor !== undefined) {
            params['page[cursor]'] = input.cursor;
        }

        const filters: string[] = [];
        if (input.metric_id !== undefined) {
            filters.push(`equals(metric_id,"${input.metric_id}")`);
        }
        if (input.profile_id !== undefined) {
            filters.push(`equals(profile_id,"${input.profile_id}")`);
        }
        if (input.datetime !== undefined) {
            filters.push(`greater-than(datetime,"${input.datetime}")`);
        }
        if (filters.length > 0) {
            params['filter'] = filters;
        }

        if (input.include !== undefined && input.include.length > 0) {
            params['include'] = input.include.join(',');
        }

        const response = await nango.get({
            // https://developers.klaviyo.com/en/reference/get_events
            endpoint: '/api/events',
            params: params,
            headers: {
                revision: '2026-04-15'
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        let nextCursor: string | undefined;
        if (providerResponse.links && providerResponse.links.next && providerResponse.links.next.length > 0) {
            const nextUrl = new URL(providerResponse.links.next);
            const cursor = nextUrl.searchParams.get('page[cursor]');
            if (cursor && cursor.length > 0) {
                nextCursor = cursor;
            }
        }

        return {
            ...(providerResponse.data !== undefined && { data: providerResponse.data }),
            ...(providerResponse.included !== undefined && { included: providerResponse.included }),
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
