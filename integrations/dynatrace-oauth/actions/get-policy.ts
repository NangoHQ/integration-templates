import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    policyUuid: z.string().describe('Policy UUID. Example: "6e6edf99-3ef3-40f5-adc5-635401719672"'),
    levelType: z.enum(['account', 'global']).optional().describe('Policy level type. Either "account" or "global". Defaults to "account" if omitted.'),
    levelId: z
        .string()
        .optional()
        .describe(
            'Level ID. For account level, the account UUID. For global level, the literal string "global". Defaults to connection_config.accountUuid for account level, or "global" for global level.'
        )
});

const ProviderConditionSchema = z.object({
    name: z.string(),
    operator: z.string(),
    values: z.array(z.string())
});

const ProviderStatementSchema = z.object({
    effect: z.string(),
    permissions: z.array(z.string()),
    conditions: z.array(ProviderConditionSchema).nullable()
});

const ProviderPolicySchema = z.object({
    uuid: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    tags: z.array(z.string()),
    statementQuery: z.string(),
    statements: z.array(ProviderStatementSchema),
    category: z.string()
});

const OutputSchema = z.object({
    uuid: z.string(),
    name: z.string(),
    description: z.string().optional(),
    tags: z.array(z.string()),
    statementQuery: z.string(),
    statements: z.array(
        z.object({
            effect: z.string(),
            permissions: z.array(z.string()),
            conditions: z
                .array(
                    z.object({
                        name: z.string(),
                        operator: z.string(),
                        values: z.array(z.string())
                    })
                )
                .nullable()
        })
    ),
    category: z.string()
});

const action = createAction({
    description: "Get a single policy's full definition (statementQuery) by uuid, at either account or global level.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['iam:policies:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const levelType = input.levelType ?? 'account';
        let resolvedLevelId = input.levelId;

        if (!resolvedLevelId) {
            if (levelType === 'global') {
                resolvedLevelId = 'global';
            } else {
                const metadata = await nango.getMetadata();
                const metadataAccountUuid = metadata && typeof metadata === 'object' && 'accountUuid' in metadata ? metadata['accountUuid'] : undefined;
                if (typeof metadataAccountUuid === 'string') {
                    resolvedLevelId = metadataAccountUuid;
                } else {
                    const connection = await nango.getConnection();
                    const configAccountUuid =
                        connection.connection_config && typeof connection.connection_config === 'object' && 'accountUuid' in connection.connection_config
                            ? connection.connection_config['accountUuid']
                            : undefined;
                    if (typeof configAccountUuid === 'string') {
                        resolvedLevelId = configAccountUuid;
                    } else {
                        throw new nango.ActionError({
                            type: 'missing_account_uuid',
                            message: 'levelId is required for account-level policies when accountUuid is not available in metadata or connection_config.'
                        });
                    }
                }
            }
        }

        // https://docs.dynatrace.com/docs/dynatrace-api/account-management-api/iam-policies-management/get-policy
        const response = await nango.get({
            endpoint: `iam/v1/repo/${encodeURIComponent(levelType)}/${encodeURIComponent(resolvedLevelId)}/policies/${encodeURIComponent(input.policyUuid)}`,
            retries: 3
        });

        if (response.status === 404) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Policy with uuid "${input.policyUuid}" not found at levelType "${levelType}" and levelId "${resolvedLevelId}".`,
                policyUuid: input.policyUuid,
                levelType: levelType,
                levelId: resolvedLevelId
            });
        }

        const providerPolicy = ProviderPolicySchema.parse(response.data);

        return {
            uuid: providerPolicy.uuid,
            name: providerPolicy.name,
            ...(providerPolicy.description != null && { description: providerPolicy.description }),
            tags: providerPolicy.tags,
            statementQuery: providerPolicy.statementQuery,
            statements: providerPolicy.statements.map((statement) => ({
                effect: statement.effect,
                permissions: statement.permissions,
                conditions: statement.conditions
            })),
            category: providerPolicy.category
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
