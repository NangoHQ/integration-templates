import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (skip offset) from the previous response. Omit for the first page.'),
    limit: z.number().optional().describe('Maximum number of records to return. Example: 50')
});

const MetadataSchema = z.object({
    base_url: z.string().optional(),
    tenant: z.string().optional(),
    connection_config: z
        .object({
            base_url: z.string().optional(),
            tenant: z.string().optional()
        })
        .optional()
});

const ProviderUserSchema = z
    .object({
        id: z.string(),
        email: z.string(),
        first_name: z.string().optional(),
        last_name: z.string().optional(),
        roles: z.array(z.string()).optional(),
        state: z.string().optional(),
        mobile: z.string().nullable().optional()
    })
    .passthrough();

const ListOutputSchema = z.object({
    items: z.array(ProviderUserSchema),
    total: z.number().optional(),
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

const action = createAction({
    description: 'List user accounts in this ConnectSecure tenant.',
    version: '1.0.0',
    input: InputSchema,
    output: ListOutputSchema,
    metadata: MetadataSchema,

    exec: async (nango, input): Promise<z.infer<typeof ListOutputSchema>> => {
        const skip = input.cursor ? parseInt(input.cursor, 10) : 0;
        if (input.cursor !== undefined && Number.isNaN(skip)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a valid numeric skip offset'
            });
        }

        const connection = await nango.getConnection();
        let baseUrl = connection.connection_config?.['base_url'];
        let tenant = connection.connection_config?.['tenant'];

        if (!baseUrl || !tenant) {
            const metadata = await nango.getMetadata();
            baseUrl = metadata.base_url ?? metadata.connection_config?.base_url;
            tenant = metadata.tenant ?? metadata.connection_config?.tenant;
        }

        if (!baseUrl || !tenant) {
            throw new nango.ActionError({
                type: 'missing_connection_config',
                message: 'Connection config must include base_url and tenant.'
            });
        }

        // https://cybercns.atlassian.net/wiki/spaces/CVB/pages/2128314664
        const authResponse = await nango.post({
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

        // https://cybercns.atlassian.net/wiki/spaces/CVB/pages/2128314664
        const usersResponse = await nango.get({
            endpoint: '/r/user/get_users',
            headers: {
                Authorization: `Bearer ${authData.access_token}`,
                'X-Tenant-Id': tenant,
                'X-User-Id': authData.user_id
            },
            params: {
                ...(skip > 0 && { skip: String(skip) }),
                ...(input.limit !== undefined && { limit: String(input.limit) })
            },
            retries: 3
        });

        const ApiResponseSchema = z.object({
            data: z.array(z.unknown()),
            status: z.boolean().optional(),
            total: z.number().optional()
        });
        const parsedBody = ApiResponseSchema.parse(usersResponse.data);

        const parsedUsers = z.array(ProviderUserSchema).safeParse(parsedBody.data);
        if (!parsedUsers.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Failed to parse user list response',
                details: parsedUsers.error.message
            });
        }

        const items = parsedUsers.data;
        const total = parsedBody.total;

        const nextSkipValue = skip + items.length;
        const nextCursor = total !== undefined && nextSkipValue < total ? String(nextSkipValue) : undefined;

        return {
            items,
            ...(total !== undefined && { total }),
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
