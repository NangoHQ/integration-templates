import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    psd_uuid: z.string().describe('The UUID of the PSD file to delete. Example: "fc2ed284-57f7-406e-b111-952e622beff3"'),
    delete_related_mockups: z.boolean().optional().describe('If true, also delete any mockups created from this PSD.')
});

const ProviderResponseSchema = z.object({
    success: z.boolean(),
    message: z.string(),
    data: z.array(z.unknown())
});

const OutputSchema = z.object({
    success: z.boolean(),
    message: z.string()
});

const action = createAction({
    description: 'Delete a previously-uploaded PSD file, optionally cascading to delete any mockup(s) that were created from it.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://docs.dynamicmockups.com/
            endpoint: 'v1/psd/delete',
            data: {
                psd_uuid: input.psd_uuid,
                ...(input.delete_related_mockups !== undefined && { delete_related_mockups: input.delete_related_mockups })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            success: providerResponse.success,
            message: providerResponse.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
