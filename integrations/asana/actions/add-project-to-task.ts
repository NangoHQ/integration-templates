import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    task_gid: z.string().describe('The task to operate on. Example: "1200000000000001"'),
    project: z.string().describe('The project to add the task to. Example: "1200000000000002"'),
    section: z.string().optional().describe('The section to add the task to within the project. Example: "1200000000000003"'),
    insert_after: z.string().optional().describe('A task ID to position this task after within the project or section. Example: "1200000000000004"'),
    insert_before: z.string().optional().describe('A task ID to position this task before within the project or section. Example: "1200000000000005"')
});

const ProviderResponseSchema = z.object({
    data: z.object({})
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Add a task to a project, optionally into a section.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/add-project-to-task',
        group: 'Tasks'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['tasks:write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: Record<string, unknown> = {
            project: input.project
        };

        if (input.section !== undefined) {
            requestBody['section'] = input.section;
        }

        if (input.insert_after !== undefined) {
            requestBody['insert_after'] = input.insert_after;
        }

        if (input.insert_before !== undefined) {
            requestBody['insert_before'] = input.insert_before;
        }

        const response = await nango.post({
            // https://developers.asana.com/reference/addprojectfortask
            endpoint: `/api/1.0/tasks/${input.task_gid}/addProject`,
            data: {
                data: requestBody
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        if (!parsed.data) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Unexpected response from Asana API.'
            });
        }

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
