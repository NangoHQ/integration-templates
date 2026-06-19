import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    space_id: z.string().describe('Space ID. Example: "901511023604"')
});

const ProviderFeatureSchema = z.object({
    enabled: z.boolean()
});

const ProviderFeaturesSchema = z
    .object({
        due_dates: ProviderFeatureSchema.optional(),
        time_tracking: ProviderFeatureSchema.optional(),
        tags: ProviderFeatureSchema.optional(),
        time_estimates: ProviderFeatureSchema.optional(),
        checklists: ProviderFeatureSchema.optional(),
        custom_fields: ProviderFeatureSchema.optional(),
        remap_dependencies: ProviderFeatureSchema.optional(),
        dependency_warning: ProviderFeatureSchema.optional(),
        portfolios: ProviderFeatureSchema.optional()
    })
    .passthrough();

const ProviderStatusSchema = z.object({
    id: z.string(),
    status: z.string(),
    orderindex: z.number(),
    color: z.string()
});

const ProviderSpaceSchema = z
    .object({
        id: z.string(),
        name: z.string(),
        color: z.string().nullable().optional(),
        private: z.boolean(),
        archived: z.boolean(),
        statuses: z.array(ProviderStatusSchema),
        multiple_assignees: z.boolean(),
        features: ProviderFeaturesSchema
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    color: z.string().optional(),
    private: z.boolean(),
    archived: z.boolean(),
    statuses: z.array(
        z.object({
            id: z.string(),
            status: z.string(),
            orderindex: z.number(),
            color: z.string()
        })
    ),
    multiple_assignees: z.boolean(),
    features: z.object({}).passthrough().optional()
});

const action = createAction({
    description: 'Retrieve a single space from ClickUp',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.clickup.com/reference/api/v2/spaces/get-space
        const response = await nango.get({
            endpoint: `/api/v2/space/${encodeURIComponent(input.space_id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Space not found',
                space_id: input.space_id
            });
        }

        const providerSpace = ProviderSpaceSchema.parse(response.data);

        return {
            id: providerSpace.id,
            name: providerSpace.name,
            ...(providerSpace.color != null && { color: providerSpace.color }),
            private: providerSpace.private,
            archived: providerSpace.archived,
            statuses: providerSpace.statuses,
            multiple_assignees: providerSpace.multiple_assignees,
            features: providerSpace.features
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
