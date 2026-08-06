import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ConnectionConfigSchema = z.object({
    accountUuid: z.string().describe('Dynatrace account UUID. Example: "9610a717-798c-423b-a80f-97cfebe72f89"')
});

const MetadataSchema = z.object({
    accountUuid: z.string().optional()
});

const ProviderGroupSchema = z.object({
    uuid: z.string(),
    name: z.string(),
    owner: z.string().describe('Group owner type. Known values: LOCAL, SCIM, SAML, DCS, ALL_USERS'),
    description: z.string().nullable().optional(),
    hidden: z.boolean().nullable().optional(),
    createdAt: z.string().nullable().optional(),
    updatedAt: z.string().nullable().optional()
});

const ProviderListGroupsSchema = z.object({
    count: z.number(),
    items: z.array(ProviderGroupSchema)
});

const OutputGroupSchema = z.object({
    uuid: z.string(),
    name: z.string(),
    owner: z.string().describe('Group owner type. Known values: LOCAL, SCIM, SAML, DCS, ALL_USERS'),
    description: z.string().optional(),
    hidden: z.boolean().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
});

const OutputSchema = z.object({
    count: z.number(),
    items: z.array(OutputGroupSchema)
});

const action = createAction({
    description: 'List user groups in this account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['iam:groups:read'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const configParse = ConnectionConfigSchema.safeParse(connection.connection_config);
        let accountUuid = configParse.success ? configParse.data.accountUuid : undefined;

        if (!accountUuid) {
            const metadata = await nango.getMetadata();
            const metaParse = MetadataSchema.safeParse(metadata);
            if (metaParse.success) {
                accountUuid = metaParse.data.accountUuid;
            }
        }

        if (!accountUuid) {
            throw new nango.ActionError({
                type: 'missing_account_uuid',
                message: 'Could not determine Dynatrace account UUID from connection config or metadata.'
            });
        }

        const response = await nango.get({
            // https://docs.dynatrace.com/docs/dynatrace-api/account-management-api/groups/list-groups
            endpoint: `iam/v1/accounts/${encodeURIComponent(accountUuid)}/groups`,
            retries: 3
        });

        const providerData = ProviderListGroupsSchema.safeParse(response.data);
        if (!providerData.success) {
            throw new nango.ActionError({
                type: 'invalid_provider_response',
                message: 'Provider returned an unexpected response shape.',
                details: providerData.error.issues
            });
        }

        return {
            count: providerData.data.count,
            items: providerData.data.items.map((item) => ({
                uuid: item.uuid,
                name: item.name,
                owner: item.owner,
                ...(item.description != null && { description: item.description }),
                ...(item.hidden != null && { hidden: item.hidden }),
                ...(item.createdAt != null && { createdAt: item.createdAt }),
                ...(item.updatedAt != null && { updatedAt: item.updatedAt })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
