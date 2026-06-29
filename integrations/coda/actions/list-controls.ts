import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    docId: z.string().describe('ID of the Coda doc. Example: "L_hgEASd6n"'),
    sortBy: z.enum(['name', 'createdAt']).optional().describe('Sort order for controls. Example: "name"'),
    limit: z.number().int().min(1).optional().describe('Maximum number of results to return. Example: 25'),
    cursor: z.string().optional().describe('Pagination cursor from the previous response. Omit for the first page.')
});

const ParentPageSchema = z.object({
    id: z.string(),
    type: z.string(),
    href: z.string(),
    browserLink: z.string().optional(),
    name: z.string().optional()
});

const ProviderControlSchema = z.object({
    id: z.string(),
    type: z.string(),
    href: z.string(),
    name: z.string(),
    controlType: z.string().optional(),
    parent: ParentPageSchema.optional()
});

const ProviderListResponseSchema = z.object({
    items: z.array(ProviderControlSchema),
    href: z.string().optional(),
    nextPageToken: z.string().optional(),
    nextPageLink: z.string().optional()
});

const ControlOutputSchema = z.object({
    id: z.string(),
    type: z.string(),
    href: z.string(),
    name: z.string(),
    controlType: z.string().optional(),
    parent: z
        .object({
            id: z.string(),
            type: z.string(),
            href: z.string(),
            browserLink: z.string().optional(),
            name: z.string().optional()
        })
        .optional()
});

const OutputSchema = z.object({
    items: z.array(ControlOutputSchema),
    nextPageToken: z.string().optional(),
    nextPageLink: z.string().optional()
});

const action = createAction({
    description: 'List interactive controls (buttons, checkboxes, sliders) in a doc.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    endpoint: {
        path: '/actions/list-controls',
        method: 'GET'
    },
    scopes: ['doc:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://coda.io/developers/apis/v1#tag/Controls/operation/listControls
            endpoint: `/docs/${encodeURIComponent(input.docId)}/controls`,
            params: {
                ...(input.sortBy !== undefined && { sortBy: input.sortBy }),
                ...(input.limit !== undefined && { limit: String(input.limit) }),
                ...(input.cursor !== undefined && { pageToken: input.cursor })
            },
            retries: 3
        });

        const providerResponse = ProviderListResponseSchema.parse(response.data);

        return {
            items: providerResponse.items.map((control) => ({
                id: control.id,
                type: control.type,
                href: control.href,
                name: control.name,
                ...(control.controlType !== undefined && { controlType: control.controlType }),
                ...(control.parent !== undefined && {
                    parent: {
                        id: control.parent.id,
                        type: control.parent.type,
                        href: control.parent.href,
                        ...(control.parent.browserLink !== undefined && { browserLink: control.parent.browserLink }),
                        ...(control.parent.name !== undefined && { name: control.parent.name })
                    }
                })
            })),
            ...(providerResponse.nextPageToken !== undefined && { nextPageToken: providerResponse.nextPageToken }),
            ...(providerResponse.nextPageLink !== undefined && { nextPageLink: providerResponse.nextPageLink })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
