import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project_id: z.string().describe('Project ID under which to create the section. Example: "6h78PW84RjxxRW8q"'),
    name: z.string().describe('Name of the new section. Example: "New Section"')
});

const ProviderSectionSchema = z
    .object({
        id: z.string(),
        project_id: z.string(),
        name: z.string(),
        added_at: z.string().optional(),
        updated_at: z.string().optional(),
        section_order: z.number().optional()
    })
    .passthrough();

const OutputSchema = z
    .object({
        id: z.string(),
        project_id: z.string(),
        name: z.string(),
        added_at: z.string().optional(),
        updated_at: z.string().optional(),
        section_order: z.number().optional()
    })
    .passthrough();

const action = createAction({
    description: 'Create a section.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['data:read_write'],

    exec: async (nango, input) => {
        const response = await nango.post({
            // https://developer.todoist.com/api/v1/#create-a-section
            endpoint: '/api/v1/sections',
            data: {
                project_id: input.project_id,
                name: input.name
            },
            retries: 3
        });

        const providerSection = ProviderSectionSchema.parse(response.data);

        return {
            id: providerSection.id,
            project_id: providerSection.project_id,
            name: providerSection.name,
            ...(providerSection.added_at !== undefined && { added_at: providerSection.added_at }),
            ...(providerSection.updated_at !== undefined && { updated_at: providerSection.updated_at }),
            ...(providerSection.section_order !== undefined && { section_order: providerSection.section_order })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
