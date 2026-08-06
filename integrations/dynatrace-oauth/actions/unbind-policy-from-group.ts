import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    accountUuid: z.string().describe('Dynatrace account UUID. Example: "9610a717-798c-423b-a80f-97cfebe72f89"'),
    policyUuid: z.string().describe('Policy UUID to unbind. Example: "6e6edf99-3ef3-40f5-adc5-635401719672"'),
    groupUuid: z.string().describe('Group UUID to remove the binding from. Example: "0bb8915e-fe63-4e37-a1ba-102e7daa375a"')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: "Remove one group's binding to a specific policy.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['iam:bindings:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://docs.dynatrace.com/docs/dynatrace-api/account-management-api
            endpoint: `/iam/v1/repo/account/${encodeURIComponent(input.accountUuid)}/bindings/${encodeURIComponent(input.policyUuid)}/${encodeURIComponent(input.groupUuid)}`,
            retries: 3
        });

        if (response.status !== 204) {
            throw new nango.ActionError({
                type: 'unexpected_status',
                message: `Expected 204 No Content, received ${response.status}`,
                status: response.status
            });
        }

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
