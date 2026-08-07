import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const BindingSchema = z
    .object({
        policyUuid: z.string(),
        groups: z.array(z.string())
    })
    .passthrough();

const OutputSchema = z
    .object({
        levelType: z.string(),
        levelId: z.string(),
        policyBindings: z.array(BindingSchema)
    })
    .passthrough();

const action = createAction({
    description: 'List every policy-to-group binding at this account level in one call.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['iam-policies-management'],
    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const metadata = await nango.getMetadata();
        const parsedMetadata = z
            .object({
                accountUuid: z.string()
            })
            .parse(metadata);
        const accountUuid = parsedMetadata.accountUuid;

        const response = await nango.get({
            // https://docs.dynatrace.com/docs/dynatrace-api/account-management-api/policy-management-api/bindings/get-level-binding
            endpoint: `/iam/v1/repo/account/${encodeURIComponent(accountUuid)}/bindings`,
            retries: 3
        });

        const providerResponse = OutputSchema.parse(response.data);
        return providerResponse;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
