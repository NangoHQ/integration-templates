import { createAction } from 'nango';
import * as z from 'zod';

const policySchema = z.object({
    uuid: z.string(),
    name: z.string(),
    description: z.string(),
    tags: z.array(z.string()),
    category: z.string()
});

const outputSchema = z.object({
    policies: z.array(policySchema)
});

export default createAction({
    description: "List Dynatrace's built-in, platform-wide policies (e.g. 'Admin User', 'AppEngine - Admin') available to bind at any account or environment.",
    version: '1.0.0',
    input: z.void(),
    output: outputSchema,
    scopes: ['account-idm-read'],

    exec: async (nango, _input) => {
        // https://docs.dynatrace.com/docs/dynatrace-api/account-management-api
        const response = await nango.get({
            endpoint: 'iam/v1/repo/global/global/policies',
            retries: 3
        });

        const parsed = outputSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({ message: 'Invalid response from Dynatrace API', details: parsed.error.issues });
        }

        return parsed.data;
    }
});
