import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        workspaceId: z.string().describe('Unique identifier of the Mural workspace. Example: "nangodev4776"'),
        limit: z.number().int().positive().max(100).optional().describe('Maximum number of templates to return (1-100). Example: 50'),
        next: z.string().optional().describe('Opaque pagination token from a previous response. Omit for the first page.'),
        withoutDefault: z.boolean().optional().describe('When true, built-in Mural default templates are excluded and only custom templates are returned.')
    })
    .describe('Filters for listing the templates recently used by the connection user in a workspace.');

const TemplateSchema = z.object({
    id: z.string().optional().describe('Unique identifier of the template.'),
    name: z.string().describe('Name of the template.'),
    description: z.string().optional().describe('Description of the template.'),
    type: z.enum(['default', 'custom']).describe('Whether the template is a built-in Mural default or a custom workspace template.'),
    workspaceId: z.string().describe('Unique identifier of the workspace that owns the template.'),
    createdBy: z.string().optional().describe('ID of the user who created the template, or "MURAL" for built-in default templates.'),
    createdOn: z.number().optional().describe('Creation time as a Unix epoch in milliseconds.'),
    updatedBy: z.string().optional().describe('ID of the user who last updated the template, or "MURAL" for built-in default templates.'),
    updatedOn: z.number().optional().describe('Last update time as a Unix epoch in milliseconds.'),
    thumbUrl: z.string().optional().describe('URL of the template thumbnail image.'),
    viewLink: z.string().optional().describe('URL to open the template in Mural.'),
    muralId: z.string().optional().describe('For custom templates, the ID of the mural the template was created from.')
});

const ProviderResponseSchema = z.object({
    value: z.array(TemplateSchema),
    next: z.string().optional()
});

const OutputSchema = z
    .object({
        items: z.array(TemplateSchema).describe('Templates recently used by the connection user in the workspace. Empty when none have been used.'),
        next: z.string().optional().describe('Opaque pagination token for fetching the next page of results.')
    })
    .describe('Recently used templates for the workspace.');

/**
 * @tags: [read]
 * @tagReason: Reads the workspace's recently used templates from the provider without modifying any provider data.
 * @pitfalls: Results reflect only templates the connection user has recently used in that workspace, so the list can be empty until they use one; built-in Mural default templates are included unless withoutDefault is true.
 */
const action = createAction({
    description: "List templates this connection's user has recently used in a workspace.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['templates:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.mural.co/public/reference/getrecenttemplates
        const response = await nango.get({
            endpoint: `/api/public/v1/workspaces/${encodeURIComponent(input.workspaceId)}/templates/recent`,
            params: {
                ...(input.limit !== undefined && { limit: input.limit }),
                ...(input.next !== undefined && { next: input.next }),
                ...(input.withoutDefault !== undefined && { withoutDefault: input.withoutDefault ? 'true' : 'false' })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            items: providerResponse.value,
            ...(providerResponse.next !== undefined && { next: providerResponse.next })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
