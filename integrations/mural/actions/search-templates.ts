import { z } from 'zod';
import { createAction } from 'nango';

const TemplateSchema = z.object({
    id: z.string().describe('Unique ID of the template. Example: "05e43d68-0a0a-47a8-a958-c08afd57d7bc"'),
    name: z.string().describe('Name of the template. Example: "Template 001"'),
    workspaceId: z.string().describe('ID of the workspace that contains the template. Example: "workspace1234"'),
    type: z.enum(['custom', 'default']).describe('Whether the template is a workspace custom template or a MURAL default template.'),
    createdOn: z.number().describe('Creation time as a Unix epoch timestamp in milliseconds. Example: 1608060691000'),
    thumbUrl: z.string().describe('URL of the template thumbnail image.'),
    viewLink: z.string().describe('URL used to open the template in MURAL.')
});

const InputSchema = z
    .object({
        workspaceId: z.string().min(1).describe('ID of the MURAL workspace to search templates in. Example: "workspace1234"'),
        query: z.string().min(1).describe('Text to search template names for. Example: "profile"'),
        limit: z.number().int().min(1).max(25).optional().describe('Maximum number of templates to return per page (1-25). Example: 20'),
        cursor: z.string().min(1).optional().describe('Pagination token returned as nextCursor by a previous call. Omit to fetch the first page.')
    })
    .describe('Search parameters for finding templates by name within a workspace.');

const OutputSchema = z
    .object({
        templates: z.array(TemplateSchema).describe('Templates matching the search query.'),
        nextCursor: z
            .string()
            .optional()
            .describe(
                'Token to fetch another page of results, passed back as the cursor input. It can still be returned on the final page, so stop when `templates` is empty.'
            )
    })
    .describe('Templates matching the search query, plus an optional cursor for the next page.');

const ProviderResponseSchema = z.object({
    value: z.array(TemplateSchema),
    next: z.string().optional()
});

/**
 * @tags: [read]
 * @tagReason: Performs a read-only full-text search for templates and never mutates provider data.
 * @pitfalls: Search matches only the workspace's own custom templates, not MURAL's shared default catalog, so a query can return an empty result set even when similarly named templates exist.
 */
const action = createAction({
    description: 'Full-text search for templates by name, scoped to a workspace.',
    version: '1.0.0',
    scopes: ['templates:read'],
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.mural.co/public/reference/searchtemplates
            endpoint: `/api/public/v1/search/${encodeURIComponent(input.workspaceId)}/templates`,
            params: {
                q: input.query,
                ...(input.limit !== undefined && { limit: input.limit }),
                ...(input.cursor !== undefined && { next: input.cursor })
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            templates: parsed.value,
            ...(parsed.next != null && { nextCursor: parsed.next })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
