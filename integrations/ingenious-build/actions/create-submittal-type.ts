import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project_id: z.string().describe('The project ID to which the submittal type belongs. Example: "6a71de59f55241acad0cd44e"'),
    title: z.string().describe('The title/name of the submittal type. Example: "Nango Registry Test Submittal Type"'),
    is_required_for_material_release: z.boolean().describe('Whether this submittal type is required for material release.')
});

const CreateResponseSchema = z.object({
    id: z.string()
});

const ProviderSubmittalTypeSchema = z.object({
    id: z.string(),
    title: z.string(),
    is_required_for_material_release: z.boolean(),
    created_by: z.string().nullable().optional(),
    created_at: z.string().optional(),
    updated_by: z.string().nullable().optional(),
    updated_at: z.string().optional(),
    project_id: z.string().nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    title: z.string(),
    is_required_for_material_release: z.boolean(),
    created_by: z.string().optional(),
    created_at: z.string().optional(),
    updated_by: z.string().optional(),
    updated_at: z.string().optional(),
    project_id: z.string().optional()
});

const action = createAction({
    description: 'Create a new submittal type for a project.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const createResponse = await nango.post({
            // https://api.ingenious.build/reference/v2-create-submittal-type.md
            endpoint: '/api/v2/pub/submittal-types',
            data: {
                project_id: input.project_id,
                title: input.title,
                is_required_for_material_release: input.is_required_for_material_release
            },
            retries: 3
        });

        const created = CreateResponseSchema.parse(createResponse.data);

        const getResponse = await nango.get({
            // https://api.ingenious.build/reference/v2-get-submittal-type.md
            endpoint: `/api/v2/pub/submittal-types/${encodeURIComponent(created.id)}`,
            retries: 3
        });

        const providerData = ProviderSubmittalTypeSchema.parse(getResponse.data);

        return {
            id: providerData.id,
            title: providerData.title,
            is_required_for_material_release: providerData.is_required_for_material_release,
            ...(providerData.created_by != null && { created_by: providerData.created_by }),
            ...(providerData.created_at !== undefined && { created_at: providerData.created_at }),
            ...(providerData.updated_by != null && { updated_by: providerData.updated_by }),
            ...(providerData.updated_at !== undefined && { updated_at: providerData.updated_at }),
            ...(providerData.project_id != null && { project_id: providerData.project_id })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
