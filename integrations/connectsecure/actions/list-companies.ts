import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    condition: z.string().optional().describe('SQL-like filter condition. Example: id=16637'),
    order_by: z.string().optional().describe('Sort order expression'),
    cursor: z.string().optional().describe('Pagination cursor (skip offset) from the previous response. Omit for the first page.'),
    limit: z.number().int().optional().describe('Maximum number of rows to return')
});

const AuthorizeResponseSchema = z
    .object({
        access_token: z.string().optional(),
        user_id: z.union([z.string(), z.number()]).optional(),
        data: z
            .object({
                access_token: z.string().optional(),
                user_id: z.union([z.string(), z.number()]).optional()
            })
            .optional()
    })
    .transform((val) => ({
        access_token: val.access_token ?? val.data?.access_token,
        user_id: val.user_id !== undefined ? String(val.user_id) : val.data?.user_id !== undefined ? String(val.data.user_id) : undefined
    }))
    .refine((val): val is { access_token: string; user_id: string } => typeof val.access_token === 'string' && typeof val.user_id === 'string', {
        message: 'Authorize response missing access_token or user_id'
    });

const ProviderCompanySchema = z
    .object({
        id: z.union([z.string(), z.number()]),
        name: z.string().optional().nullable(),
        description: z.string().optional().nullable(),
        tenantid: z.union([z.string(), z.number()]).optional().nullable(),
        created: z.string().optional().nullable(),
        updated: z.string().optional().nullable()
    })
    .passthrough();

const OutputCompanySchema = z.object({
    id: z.string().describe('Company ID. Example: 16637'),
    name: z.string().optional(),
    description: z.string().optional(),
    tenant_id: z.string().optional(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(OutputCompanySchema),
    total: z.number().optional(),
    next_cursor: z.string().optional().describe('Cursor for the next page, if more items exist.')
});

const action = createAction({
    description: 'List MSP client companies (tenant-scoped) in this ConnectSecure account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.cursor !== undefined && !/^\d+$/.test(input.cursor)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a valid numeric skip offset'
            });
        }
        const skip = input.cursor ? parseInt(input.cursor, 10) : 0;
        if (!Number.isSafeInteger(skip)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a valid numeric skip offset'
            });
        }

        const connection = await nango.getConnection();
        const connectionConfigTenant = connection.connection_config?.['tenant'];
        let tenant: string | undefined = typeof connectionConfigTenant === 'string' ? connectionConfigTenant : undefined;

        if (!tenant) {
            const metadata = await nango.getMetadata();
            const MetadataSchema = z.record(z.string(), z.unknown());
            const metadataParsed = MetadataSchema.safeParse(metadata);
            if (metadataParsed.success) {
                const fromMeta = metadataParsed.data['tenant'];
                if (typeof fromMeta === 'string') {
                    tenant = fromMeta;
                } else {
                    const metaConfig = metadataParsed.data['connection_config'];
                    if (metaConfig && typeof metaConfig === 'object') {
                        const ConfigSchema = z.record(z.string(), z.unknown());
                        const configParsed = ConfigSchema.safeParse(metaConfig);
                        if (configParsed.success) {
                            const fromConfig = configParsed.data['tenant'];
                            if (typeof fromConfig === 'string') {
                                tenant = fromConfig;
                            }
                        }
                    }
                }
            }
        }

        if (!tenant) {
            throw new nango.ActionError({
                type: 'missing_connection_config',
                message: 'tenant is required in connection config or metadata'
            });
        }

        const authResponse = await nango.post({
            // https://cybercns.atlassian.net/wiki/spaces/CVB/pages/2128314664
            endpoint: '/w/authorize',
            retries: 3
        });

        const authParsed = AuthorizeResponseSchema.safeParse(authResponse.data);
        if (!authParsed.success) {
            throw new nango.ActionError({
                type: 'auth_failed',
                message: 'Failed to obtain access_token or user_id from /w/authorize'
            });
        }
        const authData = authParsed.data;

        const response = await nango.get({
            // https://cybercns.atlassian.net/wiki/spaces/CVB/pages/2128314664
            endpoint: '/r/company/companies',
            params: {
                ...(input.condition !== undefined && { condition: input.condition }),
                ...(input.order_by !== undefined && { order_by: input.order_by }),
                ...(skip > 0 && { skip: String(skip) }),
                ...(input.limit !== undefined && { limit: String(input.limit) })
            },
            headers: {
                Authorization: `Bearer ${authData.access_token}`,
                'X-Tenant-Id': tenant,
                'X-User-Id': authData.user_id
            },
            retries: 3
        });

        const providerResponse = z
            .object({
                data: z.array(z.unknown()),
                status: z.boolean().optional(),
                total: z.number().optional()
            })
            .parse(response.data);

        const items = providerResponse.data.map((raw: unknown) => {
            const company = ProviderCompanySchema.parse(raw);
            return {
                id: String(company.id),
                ...(company.name != null && { name: company.name }),
                ...(company.description != null && { description: company.description }),
                ...(company.tenantid != null && { tenant_id: String(company.tenantid) }),
                ...(company.created != null && { created_at: company.created }),
                ...(company.updated != null && { updated_at: company.updated })
            };
        });

        const nextSkip = skip + items.length;
        const nextCursor = items.length > 0 && providerResponse.total !== undefined && nextSkip < providerResponse.total ? String(nextSkip) : undefined;

        return {
            items,
            ...(providerResponse.total !== undefined && { total: providerResponse.total }),
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
