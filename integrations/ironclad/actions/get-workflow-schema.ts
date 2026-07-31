import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    schemaId: z.string().describe('Workflow schema ID. Example: "68dc41e5a7987b1e623e4711"')
});

const SchemaFieldSchema = z
    .object({
        type: z.string(),
        displayName: z.string(),
        required: z.string(),
        options: z
            .object({
                freeTextAllowed: z.boolean().optional(),
                values: z.array(z.string()).optional()
            })
            .optional(),
        elementType: z.record(z.string(), z.unknown()).optional(),
        default: z.unknown().optional(),
        schema: z.record(z.string(), z.unknown()).optional()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    schema: z.record(z.string(), SchemaFieldSchema),
    permissions: z.array(z.string())
});

const action = createAction({
    description: 'Get the full field schema for a single workflow template.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['public.workflows.readSchemas'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.ironcladapp.com/reference/retrieve-a-workflow-schema
            endpoint: `/public/api/v1/workflow-schemas/${encodeURIComponent(input.schemaId)}`,
            params: {
                form: 'launch'
            },
            retries: 3
        });

        const providerSchema = OutputSchema.parse(response.data);
        return providerSchema;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
