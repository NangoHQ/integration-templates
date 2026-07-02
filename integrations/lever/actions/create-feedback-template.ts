import { z } from 'zod';
import { createAction } from 'nango';

const InputFieldSchema = z
    .object({
        type: z.string(),
        text: z.string(),
        description: z.string().optional(),
        required: z.boolean().optional(),
        options: z.array(z.object({ text: z.string() })).optional()
    })
    .passthrough();

const InputSchema = z.object({
    text: z.string().describe('Name of the feedback template. Example: "Phone Screen Feedback Form"'),
    instructions: z.string().optional().describe('Instructions for the feedback template.'),
    group: z.string().optional().describe('Group UID for the feedback template.'),
    fields: z.array(InputFieldSchema).describe('Array of form fields. Must include exactly one field of type score-system.')
});

const OutputFieldSchema = z
    .object({
        id: z.string(),
        type: z.string(),
        text: z.string(),
        description: z.string().optional(),
        required: z.boolean().optional(),
        prompt: z.string().optional(),
        options: z.array(z.object({ text: z.string() })).optional()
    })
    .passthrough();

const OutputGroupSchema = z.object({
    id: z.string(),
    name: z.string()
});

const OutputSchema = z.object({
    id: z.string(),
    text: z.string(),
    instructions: z.string().optional(),
    group: OutputGroupSchema.optional(),
    fields: z.array(OutputFieldSchema),
    createdAt: z.number(),
    updatedAt: z.number()
});

const ProviderResponseSchema = z
    .object({
        id: z.string(),
        text: z.string(),
        instructions: z.string().optional(),
        group: z.union([OutputGroupSchema, z.null()]).optional(),
        fields: z.array(OutputFieldSchema),
        createdAt: z.number(),
        updatedAt: z.number()
    })
    .passthrough();

const action = createAction({
    description: 'Create a new feedback/interview scorecard template.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['feedback_templates:write:admin'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const scoreSystemCount = input.fields.filter((field) => field.type === 'score-system').length;
        if (scoreSystemCount !== 1) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'A Feedback Template requires exactly 1 field of type score-system.'
            });
        }

        const response = await nango.post({
            // https://hire.lever.co/developer/documentation#create-a-feedback-template
            endpoint: '/v1/feedback_templates',
            data: {
                text: input.text,
                ...(input.instructions !== undefined && { instructions: input.instructions }),
                ...(input.group !== undefined && { group: input.group }),
                fields: input.fields
            },
            retries: 10
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Feedback template creation returned an empty response.'
            });
        }

        const wrappedResponse = z.object({ data: ProviderResponseSchema }).safeParse(response.data);
        if (wrappedResponse.success) {
            const providerTemplate = wrappedResponse.data.data;
            return {
                id: providerTemplate.id,
                text: providerTemplate.text,
                ...(providerTemplate.instructions !== undefined && { instructions: providerTemplate.instructions }),
                ...(providerTemplate.group !== undefined && providerTemplate.group !== null && { group: providerTemplate.group }),
                fields: providerTemplate.fields,
                createdAt: providerTemplate.createdAt,
                updatedAt: providerTemplate.updatedAt
            };
        }

        const flatResponse = ProviderResponseSchema.safeParse(response.data);
        if (flatResponse.success) {
            const providerTemplate = flatResponse.data;
            return {
                id: providerTemplate.id,
                text: providerTemplate.text,
                ...(providerTemplate.instructions !== undefined && { instructions: providerTemplate.instructions }),
                ...(providerTemplate.group !== undefined && providerTemplate.group !== null && { group: providerTemplate.group }),
                fields: providerTemplate.fields,
                createdAt: providerTemplate.createdAt,
                updatedAt: providerTemplate.updatedAt
            };
        }

        throw new nango.ActionError({
            type: 'provider_error',
            message: 'Unexpected response format from feedback template creation.'
        });
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
