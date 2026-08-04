import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const ProviderCredentialSchema = z.record(z.string(), z.unknown());

const ProviderResponseSchema = z.object({
    data: z.array(ProviderCredentialSchema),
    total: z.number()
});

const OutputSchema = z.object({
    items: z.array(ProviderCredentialSchema),
    total: z.number(),
    next_cursor: z.string().optional()
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

const ConnectionSchema = z.object({
    connection_config: z.record(z.string(), z.unknown()).optional()
});

const action = createAction({
    description: 'List stored scan/discovery credentials configured for this account',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const skip = input.cursor ? Number(input.cursor) : 0;
        if (input.cursor !== undefined && Number.isNaN(skip)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'Cursor must be a numeric offset.'
            });
        }
        const limit = 100;

        const connection = ConnectionSchema.parse(await nango.getConnection());
        const connectionConfig = connection.connection_config || {};
        let tenant = typeof connectionConfig['tenant'] === 'string' ? connectionConfig['tenant'] : '';

        if (!tenant) {
            const metadata = await nango.getMetadata();
            const MetadataSchema = z.record(z.string(), z.unknown());
            const metadataParsed = MetadataSchema.safeParse(metadata);
            if (metadataParsed.success) {
                const fromMeta = metadataParsed.data['tenant'];
                if (typeof fromMeta === 'string') {
                    tenant = fromMeta;
                }
            }
        }

        if (!tenant) {
            throw new nango.ActionError({
                type: 'missing_connection_config',
                message: 'tenant is required in connection configuration.'
            });
        }

        // https://cybercns.atlassian.net/wiki/spaces/CVB/pages/2128314664
        const authResponse = await nango.post({
            endpoint: '/w/authorize',
            retries: 3
        });

        const authParsed = AuthorizeResponseSchema.parse(authResponse.data);
        const token = authParsed.access_token || '';
        const userId = authParsed.user_id || '';

        if (!token || !userId) {
            throw new nango.ActionError({
                type: 'auth_failed',
                message: 'Failed to obtain bearer token or user id from ConnectSecure.'
            });
        }

        const response = await nango.get({
            // https://cybercns.atlassian.net/wiki/spaces/CVB/pages/2128314664
            endpoint: '/r/company/credentials',
            params: {
                skip: String(skip),
                limit: String(limit)
            },
            headers: {
                Authorization: `Bearer ${token}`,
                'X-Tenant-Id': tenant,
                'X-User-Id': userId
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        const hasMore = parsed.data.length > 0 && skip + parsed.data.length < parsed.total;
        const nextCursor = hasMore ? String(skip + parsed.data.length) : undefined;

        return {
            items: parsed.data,
            total: parsed.total,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
