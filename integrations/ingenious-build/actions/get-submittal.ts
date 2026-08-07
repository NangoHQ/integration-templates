import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Submittal ID. Example: "6a71dfaff55241acad0cd581"')
});

const ProviderSubmittalSchema = z
    .object({
        id: z.string(),
        project_id: z.string().optional(),
        package_id: z.string().optional(),
        status: z.string().optional(),
        type_id: z.string().optional(),
        title: z.string().optional(),
        number: z.string().optional(),
        description: z.string().optional().nullable(),
        due_date: z.string().optional().nullable(),
        ball_in_court_id: z.string().optional().nullable()
    })
    .passthrough();

const OutputSchema = z
    .object({
        id: z.string(),
        project_id: z.string().optional(),
        package_id: z.string().optional(),
        status: z.string().optional(),
        type_id: z.string().optional(),
        title: z.string().optional(),
        number: z.string().optional(),
        description: z.string().optional(),
        due_date: z.string().optional(),
        ball_in_court_id: z.string().optional()
    })
    .passthrough();

const action = createAction({
    description: 'Get a single submittal by id.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://api.ingenious.build/reference/getsubmittalpubv2.md
        const response = await nango.get({
            endpoint: `/api/v2/pub/submittals/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data || (typeof response.data === 'object' && Object.keys(response.data).length === 0)) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Submittal not found',
                id: input.id
            });
        }

        const providerSubmittal = ProviderSubmittalSchema.parse(response.data);

        return {
            id: providerSubmittal.id,
            project_id: providerSubmittal.project_id,
            package_id: providerSubmittal.package_id,
            status: providerSubmittal.status,
            type_id: providerSubmittal.type_id,
            title: providerSubmittal.title,
            number: providerSubmittal.number,
            ...(providerSubmittal.description != null && { description: providerSubmittal.description }),
            ...(providerSubmittal.due_date != null && { due_date: providerSubmittal.due_date }),
            ...(providerSubmittal.ball_in_court_id != null && { ball_in_court_id: providerSubmittal.ball_in_court_id })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
