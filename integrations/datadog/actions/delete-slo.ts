import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    slo_id: z.string().describe('The ID of the SLO to delete. Example: "36a7b293b95a55cda85b5ee2cf34a911"')
});

const ProviderDeleteResponseSchema = z.object({
    data: z.array(z.string()),
    error: z.unknown().nullable()
});

const OutputSchema = z.object({
    deleted_ids: z.array(z.string())
});

const action = createAction({
    description: 'Delete an SLO.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://docs.datadoghq.com/api/latest/service-level-objectives/#delete-an-slo
            endpoint: `v1/slo/${encodeURIComponent(input.slo_id)}`,
            retries: 1
        });

        const providerResponse = ProviderDeleteResponseSchema.parse(response.data);

        return {
            deleted_ids: providerResponse.data
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
