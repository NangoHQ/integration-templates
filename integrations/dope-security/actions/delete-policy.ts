import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    policyName: z.string().min(1).describe('The name of the custom policy to delete. Example: "MyPolicy"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    policyName: z.string()
});

const action = createAction({
    description: 'Delete a custom policy.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.policyName === 'Base Policy') {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: "Cannot delete the built-in 'Base Policy'."
            });
        }

        // https://inflight.dope.security/dope.apis/public-api-specification
        await nango.delete({
            endpoint: `/v1/policies/${encodeURIComponent(input.policyName)}`,
            retries: 3
        });

        return {
            success: true,
            policyName: input.policyName
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
