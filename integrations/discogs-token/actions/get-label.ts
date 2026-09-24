import { createAction } from 'nango';
import { z } from 'zod';

const InputSchema = z.object({ label_id: z.number().int().positive() });
const OutputSchema = z
    .object({
        id: z.number(),
        name: z.string(),
        resource_url: z.string(),
        uri: z.string().optional(),
        releases_url: z.string().optional(),
        profile: z.string().optional(),
        contact_info: z.string().optional(),
        data_quality: z.string().optional(),
        urls: z.array(z.string()).optional(),
        sublabels: z.array(z.object({ id: z.number(), name: z.string(), resource_url: z.string().optional() }).passthrough()).optional(),
        parent_label: z.object({ id: z.number(), name: z.string(), resource_url: z.string().optional() }).passthrough().optional()
    })
    .passthrough();

const action = createAction({
    description: 'Get a label by ID.',
    version: '1.0.0',
    endpoint: { method: 'GET', path: '/labels', group: 'Database' },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input) => {
        // https://www.discogs.com/developers#page:database,header-database-label
        const response = await nango.get({
            endpoint: `/labels/${input.label_id}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({ message: 'Label not found', label_id: input.label_id });
        }

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
