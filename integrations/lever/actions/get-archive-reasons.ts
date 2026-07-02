import { z } from 'zod';
import { createAction } from 'nango';

const ArchiveReasonSchema = z.object({
    id: z.string(),
    text: z.string(),
    status: z.string(),
    type: z.string()
});

const ProviderResponseSchema = z.object({
    data: z.array(ArchiveReasonSchema)
});

const OutputSchema = z.object({
    success: z.boolean(),
    response: z.array(ArchiveReasonSchema)
});

const action = createAction({
    description: 'Get all archived reasons',
    version: '2.0.0',

    input: z.void(),
    output: OutputSchema,

    exec: async (nango): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://hire.lever.co/developer/documentation#list-all-archive-reasons
            endpoint: '/v1/archive_reasons',
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            success: true,
            response: providerResponse.data
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
