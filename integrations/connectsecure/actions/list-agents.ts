import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (skip offset) from the previous response. Omit for the first page.'),
    limit: z.number().optional().describe('Maximum number of agents to return per page.'),
    sort: z.string().optional().describe('Sort expression, e.g. "host_name ASC".')
});

const AgentSchema = z
    .object({
        id: z.number()
    })
    .passthrough();

const OutputSchema = z.object({
    items: z.array(AgentSchema),
    next_cursor: z.string().optional().describe('Cursor for the next page, if more results are available.')
});

const MetadataSchema = z.object({
    tenant: z.string()
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
    description: 'List monitoring agents installed across assets in this account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const skip = input.cursor ? parseInt(input.cursor, 10) : 0;
        if (Number.isNaN(skip)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a valid numeric skip offset'
            });
        }

        const metadata = MetadataSchema.parse(await nango.getMetadata());
        const tenantId = metadata.tenant;

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

        const accessToken = authParsed.data.access_token;
        const userId = authParsed.data.user_id;

        if (!accessToken || !userId) {
            throw new nango.ActionError({
                type: 'auth_failed',
                message: 'Failed to obtain access token or user_id from /w/authorize'
            });
        }

        const response = await nango.get({
            // https://cybercns.atlassian.net/wiki/spaces/CVB/pages/2128314664
            endpoint: '/r/company/agents',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'X-Tenant-Id': String(tenantId),
                'X-User-Id': String(userId)
            },
            params: {
                ...(skip > 0 && { skip: String(skip) }),
                ...(input.limit !== undefined && { limit: String(input.limit) }),
                ...(input.sort !== undefined && { sort: input.sort })
            },
            retries: 3
        });

        const rawData = z
            .object({
                data: z.array(z.unknown()).optional(),
                status: z.boolean().optional(),
                total: z.number().optional()
            })
            .parse(response.data);

        const items = (rawData.data || []).map((item: unknown) => {
            return AgentSchema.parse(item);
        });

        const nextCursor = rawData.total !== undefined && rawData.total > skip + items.length ? String(skip + items.length) : undefined;

        return {
            items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
