import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    section_id: z.string().describe('Section ID. Example: "6h78Pcqxgv66G2rq"'),
    name: z.string().describe('New name for the section. Example: "Updated Section Name"')
});

const ProviderSectionSchema = z.object({
    id: z.string(),
    name: z.string(),
    project_id: z.string(),
    order: z.number().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    project_id: z.string(),
    order: z.number().optional()
});

const action = createAction({
    description: 'Rename a section.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.todoist.com/api/v1/#update-a-section
            endpoint: `/api/v1/sections/${encodeURIComponent(input.section_id)}`,
            data: {
                name: input.name
            },
            retries: 3
        });

        const providerSection = ProviderSectionSchema.parse(response.data);

        return {
            id: providerSection.id,
            name: providerSection.name,
            project_id: providerSection.project_id,
            ...(providerSection.order !== undefined && { order: providerSection.order })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
