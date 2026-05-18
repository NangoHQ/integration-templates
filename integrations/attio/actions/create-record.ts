import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    object: z.string(),
    values: z.record(z.string(), z.array(z.unknown()))
});

const RecordIdSchema = z.object({
    workspace_id: z.string(),
    object_id: z.string(),
    record_id: z.string()
});

const CreatedByActorSchema = z.object({
    id: z.string().nullable(),
    type: z.string().nullable()
});

const ValueSchema = z
    .object({
        active_from: z.string(),
        active_until: z.string().nullable(),
        created_by_actor: CreatedByActorSchema,
        attribute_type: z.string()
    })
    .passthrough();

const ProviderRecordSchema = z.object({
    id: RecordIdSchema,
    created_at: z.string(),
    web_url: z.string(),
    values: z.record(z.string(), z.array(ValueSchema))
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
    web_url: z.string()
});

const action = createAction({
    description: 'Create a record in Attio',
    version: '2.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-record',
        group: 'Records'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['record_permission:read-write', 'object_configuration:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.attio.com/rest-api/endpoint-reference/records/create-a-record
        const response = await nango.post({
            endpoint: `/v2/objects/${input.object}/records`,
            data: {
                data: {
                    values: input.values
                }
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'empty_response',
                message: 'Received empty response from Attio API'
            });
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            id: providerResponse.data.id,
            created_at: providerResponse.data.created_at,
            web_url: providerResponse.data.web_url
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
