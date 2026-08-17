import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
    })
    .describe('Input for listing project users.');

const ProjectUserSchema = z.object({
    userId: z.string(),
    name: z.string().optional(),
    email: z.string().optional()
});

const ProviderResponseSchema = z.object({
    pagination: z.object({}).passthrough().optional(),
    items: z.array(ProjectUserSchema.passthrough()).optional()
});

const OutputSchema = z
    .object({
        items: z
            .array(
                z.object({
                    userId: z.string().describe('Unique identifier of the user.'),
                    name: z.string().optional().describe('Display name of the user.'),
                    email: z.string().optional().describe('Email address of the user.')
                })
            )
            .describe('Deduplicated list of project users.'),
        nextCursor: z.string().optional().describe('Pagination cursor for the next page, if more results exist.')
    })
    .describe('Output containing the deduplicated list of project users and optional pagination cursor.');

/**
 * @tags: [read]
 * @tagReason: Simple read-only list of project users.
 * @pitfalls: The provider API can list the same user multiple times; the action removes duplicates by userId, so the returned items count may be lower than the provider's itemCount. The provider's pagination object only ever contains page/pageSize/pageCount/itemCount — there is no cursor-style field — so nextCursor must be derived by comparing page against pageCount.
 */
const action = createAction({
    description: 'List users who can be assigned time/tasks on projects.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['projects', 'projects.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();

        let tenantId: string | undefined;
        if (connection.connection_config && typeof connection.connection_config === 'object' && 'tenant_id' in connection.connection_config) {
            const parsed = z.string().min(1).safeParse(connection.connection_config['tenant_id']);
            if (parsed.success) {
                tenantId = parsed.data;
            }
        }

        if (!tenantId && connection.metadata && typeof connection.metadata === 'object' && 'tenantId' in connection.metadata) {
            const parsed = z.string().min(1).safeParse(connection.metadata['tenantId']);
            if (parsed.success) {
                tenantId = parsed.data;
            }
        }

        if (!tenantId) {
            // https://developer.xero.com/documentation/api/accounting/overview#connections
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 10
            });

            const rawConnections = connectionsResponse.data;
            if (!Array.isArray(rawConnections) || rawConnections.length === 0) {
                throw new nango.ActionError({
                    type: 'missing_tenant',
                    message: 'No Xero tenants found for this connection.'
                });
            }

            if (rawConnections.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_tenants',
                    message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                });
            }

            const firstConnection = z.object({ tenantId: z.string() }).passthrough().safeParse(rawConnections[0]);
            if (firstConnection.success && firstConnection.data.tenantId.length > 0) {
                tenantId = firstConnection.data.tenantId;
            }
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'missing_tenant',
                message: 'Unable to resolve xero-tenant-id.'
            });
        }

        // https://developer.xero.com/documentation/api/projects/overview
        const response = await nango.get({
            endpoint: 'projects.xro/2.0/ProjectsUsers',
            headers: {
                'xero-tenant-id': tenantId
            },
            params: {
                ...(input.cursor !== undefined && { page: input.cursor })
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        const items = parsed.items || [];

        const seen = new Set<string>();
        const deduplicated = [];
        for (const item of items) {
            const parsedUser = ProjectUserSchema.parse(item);
            if (!seen.has(parsedUser.userId)) {
                seen.add(parsedUser.userId);
                deduplicated.push({
                    userId: parsedUser.userId,
                    ...(parsedUser.name !== undefined && { name: parsedUser.name }),
                    ...(parsedUser.email !== undefined && { email: parsedUser.email })
                });
            }
        }

        // Extract next cursor from pagination if available
        let nextCursor: string | undefined;
        const pagination = parsed.pagination;
        if (pagination && typeof pagination === 'object' && !Array.isArray(pagination)) {
            const page = pagination['page'];
            const pageCount = pagination['pageCount'];
            if (typeof page === 'number' && typeof pageCount === 'number' && page < pageCount) {
                nextCursor = String(page + 1);
            }
        }

        return {
            items: deduplicated,
            ...(nextCursor !== undefined && { nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
