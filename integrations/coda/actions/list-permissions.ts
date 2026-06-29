import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    docId: z.string().describe('ID of the Coda doc. Example: "AbCDeFGH"'),
    limit: z.number().optional().describe('Maximum number of results to return. Example: 10'),
    cursor: z.string().optional().describe('Pagination cursor (pageToken) from the previous response. Omit for the first page.')
});

const ProviderPrincipalSchema = z
    .object({
        type: z.string(),
        email: z.string().optional()
    })
    .passthrough();

const ProviderPermissionSchema = z
    .object({
        id: z.string(),
        access: z.string(),
        principal: ProviderPrincipalSchema
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    items: z.array(ProviderPermissionSchema).optional(),
    nextPageToken: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(ProviderPermissionSchema),
    nextPageToken: z.string().optional()
});

const action = createAction({
    description: 'List sharing permissions on a doc.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write'],
    endpoint: {
        path: '/actions/list-permissions',
        method: 'GET'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://coda.io/developers/apis/v1
        const response = await nango.get({
            endpoint: `/docs/${encodeURIComponent(input.docId)}/acl/permissions`,
            params: {
                ...(input.limit !== undefined && { limit: String(input.limit) }),
                ...(input.cursor && { pageToken: input.cursor })
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Coda API',
                errors: parsed.error.issues
            });
        }

        return {
            items: parsed.data.items || [],
            ...(parsed.data.nextPageToken !== undefined && { nextPageToken: parsed.data.nextPageToken })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
