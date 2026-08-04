import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (skip offset) from the previous response. Omit for the first page.'),
    limit: z.number().optional().describe('Maximum number of jobs to return. Example: 100'),
    sort: z.string().optional().describe('Optional sort expression. Example: created_at desc')
});

const OutputSchema = z.object({
    items: z.array(z.record(z.string(), z.unknown())),
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

const action = createAction({
    description: 'List background jobs (scans, syncs, report generation, etc) run in this account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.cursor !== undefined && !/^\d+$/.test(input.cursor)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a valid numeric skip offset'
            });
        }
        const skip = input.cursor ? parseInt(input.cursor, 10) : 0;
        const limit = input.limit ?? 100;

        const connection = await nango.getConnection();
        const connectionConfigTenant = connection.connection_config?.['tenant'];
        let tenant: string | undefined = typeof connectionConfigTenant === 'string' ? connectionConfigTenant : undefined;

        if (!tenant) {
            const metadata = await nango.getMetadata();
            const metadataParsed = z.object({ tenant: z.string() }).safeParse(metadata);
            tenant = metadataParsed.success ? metadataParsed.data.tenant : undefined;
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
            endpoint: '/r/company/jobs',
            params: {
                skip: String(skip),
                limit: String(limit),
                ...(input.sort !== undefined && { sort: input.sort })
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
                data: z.array(z.record(z.string(), z.unknown())),
                total: z.number(),
                status: z.boolean().optional()
            })
            .parse(response.data);

        const items = providerResponse.data;
        const total = providerResponse.total;
        const nextSkip = skip + items.length;

        return {
            items,
            total,
            ...(items.length > 0 && nextSkip < total && { next_cursor: String(nextSkip) })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
