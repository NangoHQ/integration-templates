import { createAction } from 'nango';
import * as z from 'zod';

const DevResourceCreateSchema = z.object({
    name: z.string(),
    url: z.string(),
    file_key: z.string(),
    node_id: z.string()
});

const InputSchema = z.object({
    dev_resources: z.array(DevResourceCreateSchema)
});

const DevResourceSchema = z.object({
    id: z.string(),
    name: z.string(),
    url: z.string(),
    file_key: z.string(),
    node_id: z.string()
});

const DevResourceErrorSchema = z.object({
    file_key: z.string().nullable(),
    node_id: z.string().nullable(),
    error: z.string()
});

const OutputSchema = z.object({
    links_created: z.array(DevResourceSchema),
    errors: z.array(DevResourceErrorSchema).optional()
});

const action = createAction({
    description: 'Create dev resources linked to Figma nodes',
    version: '1.0.0',
    endpoint: { method: 'POST', path: '/actions/create-dev-resources' },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['dev_resources:write'],

    exec: async (nango, input) => {
        // https://developers.figma.com/docs/rest-api/dev-resources-endpoints/
        const response = await nango.post({
            endpoint: '/v1/dev_resources',
            data: {
                dev_resources: input.dev_resources.map((resource) => ({
                    name: resource.name,
                    url: resource.url,
                    file_key: resource.file_key,
                    node_id: resource.node_id
                }))
            },
            retries: 3
        });

        const raw = response.data;
        if (typeof raw !== 'object' || raw === null) {
            throw new nango.ActionError({
                message: 'Unexpected response from Figma API'
            });
        }

        const parsed = OutputSchema.safeParse(raw);
        if (!parsed.success) {
            throw new nango.ActionError({
                message: 'Invalid response from Figma API',
                details: parsed.error.issues
            });
        }

        return parsed.data;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
