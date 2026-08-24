import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    tenant: z.string().optional(),
    connection_config: z.object({ tenant: z.string().optional() }).optional()
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

const ProviderUserSchema = z
    .object({
        id: z.string(),
        email: z.string().optional(),
        first_name: z.string().optional(),
        last_name: z.string().optional(),
        roles: z.array(z.string()).optional(),
        phone: z.string().nullable().optional(),
        user_name: z.string().optional(),
        state: z.string().optional(),
        created_date: z.string().optional()
    })
    .passthrough();

const UserSchema = z.object({
    id: z.string(),
    email: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    roles: z.array(z.string()).optional(),
    phone: z.string().optional(),
    user_name: z.string().optional(),
    state: z.string().optional(),
    created_date: z.string().optional()
});

const CheckpointSchema = z.object({
    page: z.number()
});

const sync = createSync({
    description: 'Sync user accounts in this tenant.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    checkpoint: CheckpointSchema,
    models: {
        User: UserSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        let page: number | undefined = 0;
        if (checkpoint != null) {
            const parsedCheckpoint = CheckpointSchema.safeParse(checkpoint);
            if (!parsedCheckpoint.success) {
                throw new Error(`Invalid checkpoint: ${parsedCheckpoint.error.message}`);
            }
            page = parsedCheckpoint.data.page;
        }

        const connection = await nango.getConnection();
        const connectionConfigTenant = connection.connection_config?.['tenant'];
        let tenant: string | undefined = typeof connectionConfigTenant === 'string' ? connectionConfigTenant : undefined;

        if (!tenant) {
            const metadata = await nango.getMetadata();
            const parsedMetadata = MetadataSchema.safeParse(metadata);
            tenant = parsedMetadata.success ? (parsedMetadata.data.tenant ?? parsedMetadata.data.connection_config?.tenant) : undefined;
        }

        if (!tenant) {
            throw new Error('tenant is required in connection config or metadata');
        }

        // https://cybercns.atlassian.net/wiki/spaces/CVB/pages/2128314664
        const authResponse = await nango.post({
            // https://cybercns.atlassian.net/wiki/spaces/CVB/pages/2128314664
            endpoint: '/w/authorize',
            retries: 3
        });

        const parsedAuth = AuthorizeResponseSchema.safeParse(authResponse.data);
        if (!parsedAuth.success) {
            throw new Error('Failed to obtain access_token or user_id from /w/authorize');
        }
        const { access_token: accessToken, user_id: userId } = parsedAuth.data;

        await nango.trackDeletesStart('User');

        // https://cybercns.atlassian.net/wiki/spaces/CVB/pages/2128314664
        const proxyConfig: ProxyConfiguration = {
            // https://cybercns.atlassian.net/wiki/spaces/CVB/pages/2128314664
            endpoint: '/r/user/get_users',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'X-Tenant-Id': tenant,
                'X-User-Id': userId
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'skip',
                offset_calculation_method: 'per-page',
                offset_start_value: page ?? 0,
                limit_name_in_request: 'limit',
                limit: 100,
                response_path: 'data',
                on_page: async ({ nextPageParam }) => {
                    page = typeof nextPageParam === 'number' ? nextPageParam : undefined;
                }
            },
            retries: 3
        };

        for await (const pageResults of nango.paginate(proxyConfig)) {
            const users = pageResults.map((record: unknown) => {
                const parsed = ProviderUserSchema.safeParse(record);
                if (!parsed.success) {
                    throw new Error(`Failed to parse user: ${parsed.error.message}`);
                }
                const user = parsed.data;
                return {
                    id: user.id,
                    ...(user.email !== undefined && { email: user.email }),
                    ...(user.first_name !== undefined && { first_name: user.first_name }),
                    ...(user.last_name !== undefined && { last_name: user.last_name }),
                    ...(user.roles !== undefined && { roles: user.roles }),
                    ...(user.phone !== null && user.phone !== undefined && { phone: user.phone }),
                    ...(user.user_name !== undefined && { user_name: user.user_name }),
                    ...(user.state !== undefined && { state: user.state }),
                    ...(user.created_date !== undefined && { created_date: user.created_date })
                };
            });

            if (users.length > 0) {
                await nango.batchSave(users, 'User');
            }

            if (page !== undefined) {
                await nango.saveCheckpoint({ page });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('User');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
