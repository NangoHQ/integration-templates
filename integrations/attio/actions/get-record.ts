import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    object: z.string().describe('A UUID or slug to identify the object. Example: "people"'),
    record_id: z.string().describe('UUID of the record to retrieve. Example: "4c6ade84-19c7-4581-95aa-b1d5f4571c25"')
});

const RecordIdSchema = z.object({
    workspace_id: z.string(),
    object_id: z.string(),
    record_id: z.string()
});

const ValueItemSchema = z
    .object({
        active_from: z.string(),
        active_until: z.string().nullable().optional(),
        created_by_actor: z.object({
            id: z.string().nullable().optional(),
            type: z.string().nullable().optional()
        }),
        attribute_type: z.string()
    })
    .passthrough();

const ArrayOfValueItemsSchema = z.array(ValueItemSchema);

const ProviderRecordSchema = z.object({
    id: RecordIdSchema,
    created_at: z.string(),
    web_url: z.string(),
    values: z.record(z.string(), ArrayOfValueItemsSchema)
});

const OutputSchema = z.object({
    id: RecordIdSchema,
    created_at: z.string(),
    web_url: z.string(),
    values: z.record(z.string(), ArrayOfValueItemsSchema)
});

const action = createAction({
    description: 'Retrieve a single record from Attio.',
    version: '2.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['record_permission:read', 'object_configuration:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.attio.com/rest-api/endpoint-reference/records/get-a-record
        const response = await nango.get({
            endpoint: `/v2/objects/${input.object}/records/${input.record_id}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Record not found',
                object: input.object,
                record_id: input.record_id
            });
        }

        if (!response.data || typeof response.data !== 'object' || !('data' in response.data)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from API'
            });
        }

        const providerRecord = ProviderRecordSchema.parse(response.data.data);

        return {
            id: providerRecord.id,
            created_at: providerRecord.created_at,
            web_url: providerRecord.web_url,
            values: providerRecord.values
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
