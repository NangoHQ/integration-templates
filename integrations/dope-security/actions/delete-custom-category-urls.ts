import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    customCategoryName: z.string().min(1).max(32).describe('Name of the custom category to clear URLs from. Example: "RegistrySeedCategory1"')
});

const OutputSchema = z.object({
    success: z.boolean().describe('Whether the URLs were successfully removed from the custom category.')
});

const action = createAction({
    description: 'Remove all URLs from a custom category.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://inflight.dope.security/dope.apis/public-api-specification
        await nango.delete({
            endpoint: `/v1/custom_categories/${encodeURIComponent(input.customCategoryName)}/urls`,
            retries: 3
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
