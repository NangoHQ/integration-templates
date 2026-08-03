import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    entitySelector: z.string().describe('Entity selector defining the scope of the query. Example: "type(HOST)" or "type(SERVICE)"'),
    fields: z.string().optional().describe('Optional fields to include in the response, e.g. "+lastSeenTms,+properties.BITNESS"'),
    pageSize: z.number().int().min(1).max(10000).optional().describe('Number of entries per page. Defaults to 50.'),
    cursor: z.string().optional().describe('Pagination cursor (nextPageKey) from the previous response. Omit for the first page.')
});

const EntitySchema = z
    .object({
        entityId: z.string(),
        displayName: z.string()
    })
    .passthrough();

const OutputSchema = z.object({
    totalCount: z.number().int().optional(),
    pageSize: z.number().int().optional(),
    nextPageKey: z.string().optional(),
    items: z.array(EntitySchema)
});

const action = createAction({
    description: 'List monitored entities matching an entity selector',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['entities.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const params: Record<string, string | number> = {};

        if (input.cursor) {
            params['nextPageKey'] = input.cursor;
        } else {
            params['entitySelector'] = input.entitySelector;
            if (input.fields !== undefined) {
                params['fields'] = input.fields;
            }
            if (input.pageSize !== undefined) {
                params['pageSize'] = input.pageSize;
            }
        }

        // https://docs.dynatrace.com/docs/dynatrace-api/environment-api/entity-v2/get-entities-list
        const response = await nango.get({
            endpoint: '/api/v2/entities',
            params,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'empty_response',
                message: 'Dynatrace returned an empty response'
            });
        }

        const ResponseSchema = z.object({
            totalCount: z.number().int().optional(),
            pageSize: z.number().int().optional(),
            nextPageKey: z.string().optional(),
            entities: z.array(z.unknown()).optional()
        });

        const parsed = ResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response format from Dynatrace'
            });
        }

        const raw = parsed.data;
        const items = (raw.entities || []).map((item: unknown) => EntitySchema.parse(item));

        return {
            ...(raw.totalCount !== undefined && { totalCount: raw.totalCount }),
            ...(raw.pageSize !== undefined && { pageSize: raw.pageSize }),
            ...(raw.nextPageKey !== undefined && { nextPageKey: raw.nextPageKey }),
            items
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
