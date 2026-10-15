import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        workspaceId: z.string().describe('ID of the workspace whose templates should be listed. Example: "nangodev4776"'),
        cursor: z.string().optional().describe('Opaque pagination cursor (`next`) returned by a previous call. Omit to fetch the first page.'),
        limit: z.number().int().min(1).max(100).optional().describe('Maximum number of templates per page (1-100, default 100).')
    })
    .describe('Input for listing the mural templates available to a workspace.');

const TemplateSchema = z.object({
    id: z.string().describe('Unique identifier of the template.'),
    name: z.string().describe('Display name of the template.'),
    description: z.string().describe('Short description of what the template is used for.'),
    type: z.string().describe('Template origin, e.g. "default" for Mural\'s curated template library.'),
    thumbUrl: z.string().describe('URL of the template thumbnail image.'),
    viewLink: z.string().describe('URL for viewing the template in Mural.'),
    createdBy: z.string().describe('Name or ID of the user who created the template.'),
    createdOn: z.number().describe('Creation time as a Unix epoch timestamp in milliseconds.'),
    updatedBy: z.string().describe('Name or ID of the user who last updated the template.'),
    updatedOn: z.number().describe('Last update time as a Unix epoch timestamp in milliseconds.'),
    workspaceId: z.string().describe('ID of the workspace that hosts the template.')
});

const OutputSchema = z
    .object({
        templates: z.array(TemplateSchema).describe('Templates returned for the requested page.'),
        next: z
            .string()
            .optional()
            .describe(
                'Opaque cursor to pass back as `cursor` to fetch the next page. Also present on the last page; detect the end via an empty `templates` array.'
            )
    })
    .describe('A page of mural templates available to the workspace, plus the cursor for the next page.');

const ProviderResponseSchema = z.object({
    next: z.string(),
    value: z.array(TemplateSchema)
});

/**
 * @tags: [read]
 * @tagReason: Reads the workspace's available mural templates from the provider without mutating any data.
 * @pitfalls: `next` is returned on every page including the last, so treat an empty `templates` array as the only end-of-results signal, and the cursor expires roughly 15 minutes after issuance; results also include Mural's own default templates hosted outside the requested workspace, not only templates created in it.
 */
const action = createAction({
    description: "List the mural templates available to a workspace, including Mural's default/shared library.",
    version: '1.0.0',
    scopes: ['templates:read'],
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.mural.co/public/reference/gettemplatesforworkspace
            endpoint: `/api/public/v1/workspaces/${encodeURIComponent(input.workspaceId)}/templates`,
            params: {
                ...(input.cursor !== undefined && { next: input.cursor }),
                ...(input.limit !== undefined && { limit: input.limit })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            templates: providerResponse.value,
            next: providerResponse.next
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
