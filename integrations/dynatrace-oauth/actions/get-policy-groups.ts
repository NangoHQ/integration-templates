import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    policyUuid: z.string().describe('Policy UUID. Example: "6e6edf99-3ef3-40f5-adc5-635401719672"'),
    accountUuid: z.string().optional().describe('Account UUID. If omitted, it will be fetched from the connection configuration.')
});

const PolicyBindingSchema = z.object({
    policyUuid: z.string(),
    groups: z.array(z.string())
});

const OutputSchema = z.object({
    levelType: z.string(),
    levelId: z.string(),
    policyBindings: z.array(PolicyBindingSchema)
});

const action = createAction({
    description: 'List which groups a specific policy is bound to.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['iam:bindings:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let accountUuid = input.accountUuid;

        if (!accountUuid) {
            const connection = await nango.getConnection();
            const fromConfig = connection.connection_config?.['accountUuid'];
            if (typeof fromConfig === 'string') {
                accountUuid = fromConfig;
            }
        }

        if (!accountUuid) {
            throw new nango.ActionError({
                type: 'missing_account_uuid',
                message: 'accountUuid is required in input or connection_config.'
            });
        }

        const response = await nango.get({
            // https://docs.dynatrace.com/docs/dynatrace-api/account-management-api/policy-management-api/bindings/get-policy-binding
            endpoint: `iam/v1/repo/account/${encodeURIComponent(accountUuid)}/bindings/${encodeURIComponent(input.policyUuid)}`,
            retries: 3
        });

        const parsed = OutputSchema.parse(response.data);
        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
