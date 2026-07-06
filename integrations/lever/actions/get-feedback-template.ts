import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Feedback template ID. Example: "1c0d54d3-1aeb-4989-b616-d0a6025444e8"')
});

const FieldSchema = z
    .object({
        id: z.string(),
        type: z.string(),
        text: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
        required: z.boolean().optional(),
        options: z
            .array(
                z
                    .object({
                        id: z.string().nullable().optional(),
                        text: z.string().nullable().optional()
                    })
                    .passthrough()
            )
            .optional()
    })
    .passthrough();

const OutputSchema = z
    .object({
        id: z.string(),
        name: z.string().nullable().optional(),
        text: z.string().nullable().optional(),
        instructions: z.string().nullable().optional(),
        fields: z.array(FieldSchema).optional()
    })
    .passthrough();

const action = createAction({
    description: 'Retrieve a single feedback template',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://hire.lever.co/developer/documentation
            endpoint: `/v1/feedback_templates/${encodeURIComponent(input.id)}`,
            retries: 3
        };

        const response = await nango.get(config);

        if (!response.data || !response.data.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Feedback template not found',
                id: input.id
            });
        }

        const providerTemplate = OutputSchema.parse(response.data.data);

        return providerTemplate;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
