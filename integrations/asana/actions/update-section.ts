import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    section_gid: z.string().min(1).describe('The globally unique identifier for the section. Example: "1200000000000001"'),
    name: z.string().describe('The updated name for the section.')
});

const ProviderSectionSchema = z.object({
    data: z.object({
        gid: z.string(),
        resource_type: z.string().optional(),
        name: z.string().optional(),
        created_at: z.string().optional(),
        project: z
            .object({
                gid: z.string(),
                resource_type: z.string().optional(),
                name: z.string().optional()
            })
            .optional()
    })
});

const OutputSchema = z.object({
    gid: z.string(),
    name: z.string().optional(),
    project: z
        .object({
            gid: z.string(),
            name: z.string().optional()
        })
        .optional()
});

const action = createAction({
    description: 'Update mutable fields on a section.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-section',
        group: 'Sections'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://developers.asana.com/reference/updatesection
            endpoint: `/api/1.0/sections/${encodeURIComponent(input.section_gid)}`,
            data: {
                data: {
                    name: input.name
                }
            },
            retries: 1
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Section not found or could not be updated.'
            });
        }

        const providerSection = ProviderSectionSchema.parse(response.data);

        const data = providerSection.data;

        return {
            gid: data.gid,
            ...(data.name != null && { name: data.name }),
            ...(data.project != null && {
                project: {
                    gid: data.project.gid,
                    ...(data.project.name != null && { name: data.project.name })
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
