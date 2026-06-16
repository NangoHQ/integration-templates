import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    event_type: z.string().optional().describe('Optional event type name to filter event properties by.'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    limit: z.number().int().min(1).max(1000).optional().describe('Maximum number of items to return per page. Defaults to 100.')
});

const ProviderEventPropertySchema = z.object({
    event_property: z.string(),
    event_type: z.string().nullish(),
    description: z.string().nullish(),
    type: z.string().nullish(),
    regex: z.string().nullish(),
    enum_values: z.string().nullish(),
    is_array_type: z.boolean(),
    is_required: z.boolean().nullish(),
    is_hidden: z.boolean().nullish(),
    classifications: z.array(z.string()).nullish()
});

const EventPropertySchema = z.object({
    event_property: z.string(),
    event_type: z.string().optional(),
    description: z.string().optional(),
    type: z.string().optional(),
    regex: z.string().optional(),
    enum_values: z.string().optional(),
    is_array_type: z.boolean(),
    is_required: z.boolean().optional(),
    is_hidden: z.boolean().optional(),
    classifications: z.array(z.string()).optional()
});

const OutputSchema = z.object({
    items: z.array(EventPropertySchema),
    next_cursor: z.string().optional()
});

const ProviderEnvelopeSchema = z.object({
    success: z.boolean(),
    data: z.array(z.unknown()).optional(),
    errors: z.array(z.unknown()).optional()
});

const action = createAction({
    description: 'List event properties in taxonomy.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/list-event-properties',
        group: 'Taxonomy'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://amplitude.com/docs/apis/analytics/taxonomy
        const response = await nango.get({
            endpoint: '/api/2/taxonomy/event-property',
            params: {
                ...(input.event_type !== undefined && { event_type: input.event_type })
            },
            retries: 3
        });

        const rawData = response.data;
        if (rawData === null || rawData === undefined || typeof rawData !== 'object' || Array.isArray(rawData)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Amplitude Taxonomy API.'
            });
        }

        const envelopeResult = ProviderEnvelopeSchema.safeParse(rawData);
        if (!envelopeResult.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response envelope from Amplitude Taxonomy API.'
            });
        }

        const envelope = envelopeResult.data;
        if (envelope.success !== true) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Amplitude Taxonomy API returned an error.',
                errors: envelope.errors
            });
        }

        const providerItems = envelope.data ?? [];
        const parsedItems = providerItems.map((item: unknown) => {
            const parsed = ProviderEventPropertySchema.safeParse(item);
            if (!parsed.success) {
                return {
                    event_property: 'unknown',
                    is_array_type: false,
                    is_required: false,
                    is_hidden: false
                };
            }
            return parsed.data;
        });

        const limit = input.limit ?? 100;
        const cursor = input.cursor ? parseInt(input.cursor, 10) : 0;
        const offset = Number.isNaN(cursor) ? 0 : cursor;

        const items = parsedItems.slice(offset, offset + limit).map((item) => ({
            event_property: item.event_property,
            ...(item.event_type != null && { event_type: item.event_type }),
            ...(item.description != null && { description: item.description }),
            ...(item.type != null && { type: item.type }),
            ...(item.regex != null && { regex: item.regex }),
            ...(item.enum_values != null && { enum_values: item.enum_values }),
            is_array_type: item.is_array_type,
            ...(item.is_required != null && { is_required: item.is_required }),
            ...(item.is_hidden != null && { is_hidden: item.is_hidden }),
            ...(item.classifications != null && { classifications: item.classifications })
        }));

        const nextOffset = offset + items.length;
        const next_cursor = nextOffset < parsedItems.length ? String(nextOffset) : undefined;

        return {
            items,
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
