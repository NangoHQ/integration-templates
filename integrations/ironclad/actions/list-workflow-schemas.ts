import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const ProviderResponseSchema = z.object({
    list: z.array(
        z
            .object({
                id: z.string(),
                name: z.string(),
                schema: z.record(z.string(), z.unknown()).optional(),
                permissions: z.array(z.string()).optional()
            })
            .passthrough()
    )
});

const OutputSchema = z.object({
    schemas: z.array(
        z.object({
            id: z.string(),
            name: z.string(),
            schema: z.record(z.string(), z.unknown()).optional(),
            permissions: z.array(z.string()).optional()
        })
    )
});

const action = createAction({
    description: 'List the workflow templates/schemas available to launch new workflows from.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['public.workflows.readSchemas'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.ironcladapp.com/reference/list-all-workflow-schemas
            endpoint: '/public/api/v1/workflow-schemas',
            params: {
                form: 'launch'
            },
            retries: 3
        });

        const rawData = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
        const parsed = ProviderResponseSchema.parse(rawData);

        return {
            schemas: parsed.list.map((item) => ({
                id: item.id,
                name: item.name,
                ...(item.schema !== undefined && { schema: item.schema }),
                ...(item.permissions !== undefined && { permissions: item.permissions })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
