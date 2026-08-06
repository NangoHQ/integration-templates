import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('Policy name. Example: "Nango Registry Test Policy"'),
    description: z.string().optional().describe('Policy description.'),
    tags: z.array(z.string()).optional().describe('Policy tags.'),
    statementQuery: z.string().describe('Policy statement query. Must be in the form "ALLOW service:resource-type:action;". Example: "ALLOW iam:groups:read;"')
});

const ProviderPolicyStatementSchema = z
    .object({
        uuid: z.string().nullish(),
        effect: z.string().nullish(),
        permissions: z.array(z.string()).nullish(),
        resources: z.array(z.string()).nullish()
    })
    .passthrough();

const ProviderPolicySchema = z
    .object({
        uuid: z.string(),
        name: z.string(),
        description: z.string().nullish(),
        tags: z.array(z.string()).nullish(),
        statements: z.array(ProviderPolicyStatementSchema).nullish()
    })
    .passthrough();

const OutputSchema = z
    .object({
        uuid: z.string(),
        name: z.string(),
        description: z.string().optional(),
        tags: z.array(z.string()).optional(),
        statements: z.array(ProviderPolicyStatementSchema).optional()
    })
    .passthrough();

const action = createAction({
    description: 'Create a new custom access policy at the account level.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['iam:policies:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const metadata = await nango.getMetadata<{ accountUuid?: string }>();

        const accountUuid = metadata?.['accountUuid'] || connection.connection_config?.['accountUuid'];
        if (typeof accountUuid !== 'string' || accountUuid.length === 0) {
            throw new nango.ActionError({
                type: 'missing_account_uuid',
                message: 'Connection config is missing accountUuid.'
            });
        }

        const response = await nango.post({
            // https://docs.dynatrace.com/docs/dynatrace-api/account-management-api/policies/create-policy
            endpoint: `iam/v1/repo/account/${encodeURIComponent(accountUuid)}/policies`,
            data: {
                name: input.name,
                description: input.description,
                tags: input.tags,
                statementQuery: input.statementQuery
            },
            retries: 1
        });

        const providerPolicy = ProviderPolicySchema.parse(response.data);

        const mapped: Record<string, unknown> = {
            uuid: providerPolicy.uuid,
            name: providerPolicy.name
        };

        if (providerPolicy['description'] != null) {
            mapped['description'] = providerPolicy['description'];
        }
        if (providerPolicy['tags'] != null) {
            mapped['tags'] = providerPolicy['tags'];
        }
        if (providerPolicy['statements'] != null) {
            mapped['statements'] = providerPolicy['statements'];
        }

        for (const key of Object.keys(providerPolicy)) {
            if (!Object.prototype.hasOwnProperty.call(mapped, key)) {
                mapped[key] = providerPolicy[key];
            }
        }

        return OutputSchema.parse(mapped);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
