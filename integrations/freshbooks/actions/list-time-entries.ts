import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    started_from: z.string().optional().describe('Filter by start time (ISO 8601). Example: "2024-01-01T00:00:00Z"'),
    started_to: z.string().optional().describe('Filter by end time (ISO 8601). Example: "2024-12-31T23:59:59Z"'),
    updated_since: z.string().optional().describe('Filter by updated since (ISO 8601). Example: "2024-01-01T00:00:00Z"'),
    page: z.number().optional().describe('Page number (1-based). Example: 1'),
    per_page: z.number().optional().describe('Items per page (max 30). Example: 30')
});

const TimerSchema = z
    .object({
        id: z.number().optional(),
        is_running: z.boolean().optional()
    })
    .nullable()
    .optional();

const TimeEntrySchema = z.object({
    id: z.number(),
    note: z.string().nullable().optional(),
    duration: z.number().nullable().optional(),
    project_id: z.number().nullable().optional(),
    client_id: z.number().nullable().optional(),
    is_logged: z.boolean().optional(),
    started_at: z.string().nullable().optional(),
    active: z.boolean().optional(),
    timer: TimerSchema
});

const MetaSchema = z.object({
    pages: z.number().optional(),
    total_logged: z.number().optional(),
    total_unbilled: z.number().optional(),
    per_page: z.number().optional(),
    total: z.number().optional(),
    page: z.number().optional()
});

const ProviderResponseSchema = z.object({
    time_entries: z.array(TimeEntrySchema),
    meta: MetaSchema
});

const OutputSchema = z.object({
    items: z.array(TimeEntrySchema),
    next_page: z.number().optional()
});

const MetadataSchema = z.object({
    businessId: z.union([z.string(), z.number()]).optional()
});

const action = createAction({
    description: 'List time entries.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['user:time_entries:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();
        const parsedMetadata = MetadataSchema.safeParse(metadata);

        if (!parsedMetadata.success || !parsedMetadata.data.businessId) {
            throw new nango.ActionError({
                type: 'invalid_metadata',
                message: 'businessId is required in metadata.'
            });
        }

        const businessId = parsedMetadata.data.businessId;

        const params: Record<string, string | number> = {};

        if (input.started_from !== undefined) {
            params['started_from'] = input.started_from;
        }
        if (input.started_to !== undefined) {
            params['started_to'] = input.started_to;
        }
        if (input.updated_since !== undefined) {
            params['updated_since'] = input.updated_since;
        }
        if (input.page !== undefined) {
            params['page'] = input.page;
        }
        if (input.per_page !== undefined) {
            params['per_page'] = input.per_page;
        }

        const config: ProxyConfiguration = {
            // https://www.freshbooks.com/api/time_entries
            endpoint: `/timetracking/business/${encodeURIComponent(String(businessId))}/time_entries`,
            params,
            retries: 3
        };

        const response = await nango.get(config);

        const providerResponse = ProviderResponseSchema.safeParse(response.data);

        if (!providerResponse.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Failed to parse FreshBooks time entries response.',
                details: providerResponse.error.message
            });
        }

        const { time_entries, meta } = providerResponse.data;

        const nextPage = meta.page !== undefined && meta.pages !== undefined && meta.page < meta.pages ? meta.page + 1 : undefined;

        return {
            items: time_entries,
            ...(nextPage !== undefined && { next_page: nextPage })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
