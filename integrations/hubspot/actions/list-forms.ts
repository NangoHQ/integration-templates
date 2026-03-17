import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor from previous response. Maps to HubSpot "after" parameter. Omit for first page.')
});

const FormSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    formType: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(FormSchema),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'List forms',
    version: '1.0.0',

    endpoint: {
        method: 'GET',
        path: '/actions/list-forms',
        group: 'Forms'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['forms'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.hubspot.com/docs/api-reference/marketing-forms-v3/forms/get-marketing-v3-forms-
        const response = await nango.get({
            endpoint: '/marketing/v3/forms/',
            params: {
                limit: '100',
                ...(input.cursor && { after: input.cursor })
            },
            retries: 3
        });

        const data = response.data;

        return {
            items: (data.results || []).map((form: any) => ({
                id: form.id,
                name: form.name ?? undefined,
                formType: form.formType ?? undefined,
                createdAt: form.createdAt ?? undefined,
                updatedAt: form.updatedAt ?? undefined
            })),
            nextCursor: data.paging?.next?.after || undefined
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
