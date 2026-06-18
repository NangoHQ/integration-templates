import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.'),
    take: z.number().min(1).max(100).optional().describe('Number of results per page. Defaults to 50.'),
    sort: z.string().optional().describe('Field to sort by. Use field:order where order is 1 for ascending and -1 for descending. e.g. created_at:1')
});

const ProviderOrganizationSchema = z.object({
    id: z.string().describe('Organization identifier. Example: "org_abc123"'),
    name: z.string().describe('The name of this organization. Example: "acme-users"'),
    display_name: z.string().optional().describe('Friendly name of this organization. Example: "Acme Users"'),
    branding: z
        .object({
            logo_url: z.string().optional(),
            colors: z
                .object({
                    primary: z.string().optional(),
                    page_background: z.string().optional()
                })
                .optional()
        })
        .optional(),
    metadata: z.record(z.string(), z.string().nullable()).optional()
});

const CheckpointPaginatedResponseSchema = z.object({
    organizations: z.array(ProviderOrganizationSchema),
    next: z.string().optional()
});

const OffsetPaginatedResponseSchema = z.object({
    organizations: z.array(ProviderOrganizationSchema),
    start: z.number(),
    limit: z.number(),
    total: z.number()
});

const OutputSchema = z.object({
    items: z.array(
        z.object({
            id: z.string(),
            name: z.string(),
            display_name: z.string().optional(),
            branding: z
                .object({
                    logo_url: z.string().optional(),
                    colors: z
                        .object({
                            primary: z.string().optional(),
                            page_background: z.string().optional()
                        })
                        .optional()
                })
                .optional(),
            metadata: z.record(z.string(), z.string().nullable()).optional()
        })
    ),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List organizations from Auth0.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['read:organizations'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://auth0.com/docs/api/management/v2/organizations/get-organizations
            endpoint: '/api/v2/organizations',
            params: {
                ...(input.cursor !== undefined && { from: input.cursor }),
                ...(input.take !== undefined && { take: input.take }),
                ...(input.sort !== undefined && { sort: input.sort })
            },
            retries: 3
        });

        let items: z.infer<typeof ProviderOrganizationSchema>[] = [];
        let nextCursor: string | undefined;

        if (Array.isArray(response.data)) {
            const parsed = z.array(ProviderOrganizationSchema).safeParse(response.data);
            if (!parsed.success) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: `Unexpected organization list shape from Auth0: ${parsed.error.message}`
                });
            }
            items = parsed.data;
        } else if (response.data && typeof response.data === 'object') {
            const checkpointParsed = CheckpointPaginatedResponseSchema.safeParse(response.data);
            if (checkpointParsed.success) {
                items = checkpointParsed.data.organizations;
                nextCursor = checkpointParsed.data.next;
            } else {
                const offsetParsed = OffsetPaginatedResponseSchema.safeParse(response.data);
                if (offsetParsed.success) {
                    items = offsetParsed.data.organizations;
                }
            }
        }

        return {
            items,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
