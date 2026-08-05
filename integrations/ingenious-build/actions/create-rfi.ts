import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    title: z.string().describe('The title of the RFI.'),
    project_id: z.string().describe('The project ID to which the RFI belongs. Example: "6a71de59f55241acad0cd44e"'),
    due_date: z.string().describe('Due date of the RFI in Y-m-d format. Example: "2026-08-04"'),
    status: z.string().describe('Status of the RFI. Only "draft" has been confirmed valid live. Example: "draft"'),
    question: z.string().describe('The question or issue described in the RFI.')
});

const ProviderCreateResponseSchema = z.object({
    id: z.string()
});

const ProviderRfiSchema = z.object({
    id: z.string(),
    title: z.string(),
    project_id: z.string(),
    due_date: z.string(),
    status: z.string(),
    question: z.string()
});

const OutputSchema = z.object({
    id: z.string(),
    title: z.string(),
    project_id: z.string(),
    due_date: z.string(),
    status: z.string(),
    question: z.string()
});

const action = createAction({
    description: 'Create a new RFI on a project.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const createResponse = await nango.post({
            // https://api.ingenious.build/reference/v2-create-rfi.md
            endpoint: '/api/v2/pub/rfis',
            data: {
                title: input.title,
                project_id: input.project_id,
                due_date: input.due_date,
                status: input.status,
                question: input.question
            },
            retries: 1
        });

        const createData = ProviderCreateResponseSchema.parse(createResponse.data);

        const getResponse = await nango.get({
            // https://api.ingenious.build/reference/v2-get-rfi-1.md
            endpoint: `/api/v2/pub/rfis/${encodeURIComponent(createData.id)}`,
            retries: 3
        });

        const providerRfi = ProviderRfiSchema.parse(getResponse.data);

        return {
            id: providerRfi.id,
            title: providerRfi.title,
            project_id: providerRfi.project_id,
            due_date: providerRfi.due_date,
            status: providerRfi.status,
            question: providerRfi.question
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
