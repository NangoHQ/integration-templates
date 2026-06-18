import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    object: z.string(),
    record_id: z.string(),
    values: z.object({}).passthrough()
});

const RecordIdSchema = z.object({
    workspace_id: z.string(),
    object_id: z.string(),
    record_id: z.string()
});

const ProviderRecordSchema = z.object({
    id: RecordIdSchema,
    created_at: z.string(),
    web_url: z.string().nullish(),
    values: z.object({}).passthrough().nullish()
});

const ProviderResponseSchema = z.object({
    data: ProviderRecordSchema
});

const OutputSchema = z.object({
    id: z.object({
        workspace_id: z.string(),
        object_id: z.string(),
        record_id: z.string()
    }),
    created_at: z.string(),
    web_url: z.string().nullish(),
    values: z.object({}).passthrough().nullish()
});

const action = createAction({
    description: 'Update a record in Attio.',
    version: '2.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['record_permission:read-write', 'object_configuration:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.attio.com/rest-api/endpoint-reference/records/update-a-record-append-multiselect-values
        const response = await nango.patch({
            endpoint: `/v2/objects/${input.object}/records/${input.record_id}`,
            data: {
                data: {
                    values: input.values
                }
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Failed to parse provider response',
                details: parsed.error.issues
            });
        }

        const record = parsed.data.data;

        return {
            id: record.id,
            created_at: record.created_at,
            ...(record.web_url != null && { web_url: record.web_url }),
            ...(record.values != null && { values: record.values })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
