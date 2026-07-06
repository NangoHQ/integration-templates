import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    templateId: z.string().describe('Feedback template ID. Example: "5b0f589c-b0c2-4e84-bf83-0f2ca48fc48a"'),
    text: z.string().optional().describe('Name of the feedback template.'),
    instructions: z.string().optional().describe('Instructions of the feedback template.'),
    group: z.string().optional().describe('The group UID.'),
    fields: z
        .array(
            z
                .object({
                    type: z.string(),
                    text: z.string(),
                    description: z.string().optional(),
                    required: z.boolean().optional(),
                    options: z.array(z.object({ text: z.string() }).passthrough()).optional(),
                    prompt: z.string().optional()
                })
                .passthrough()
        )
        .optional()
        .describe('An array of form fields. Must contain exactly one field of type score-system.')
});

const ProviderGroupSchema = z.object({
    id: z.string(),
    name: z.string()
});

const ProviderStageSchema = z.object({
    id: z.string(),
    text: z.string()
});

const ProviderFieldSchema = z
    .object({
        id: z.string(),
        type: z.string(),
        text: z.string(),
        description: z.string().optional(),
        required: z.boolean().optional(),
        options: z.array(z.object({ text: z.string() }).passthrough()).optional(),
        prompt: z.string().optional()
    })
    .passthrough();

const ProviderTemplateSchema = z.object({
    id: z.string(),
    text: z.string(),
    instructions: z.string().optional(),
    group: ProviderGroupSchema.nullable().optional(),
    stage: ProviderStageSchema.nullable().optional(),
    createdAt: z.number(),
    updatedAt: z.number(),
    fields: z.array(ProviderFieldSchema)
});

const OutputSchema = z.object({
    id: z.string(),
    text: z.string(),
    instructions: z.string().optional(),
    group: ProviderGroupSchema.nullable().optional(),
    stage: ProviderStageSchema.nullable().optional(),
    createdAt: z.number(),
    updatedAt: z.number(),
    fields: z.array(ProviderFieldSchema)
});

const action = createAction({
    description: "Update an existing feedback template's text or fields.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['feedback_templates:write:admin'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const getResponse = await nango.get({
            // https://hire.lever.co/developer/documentation#retrieve-a-feedback-template
            endpoint: `/v1/feedback_templates/${encodeURIComponent(input.templateId)}`,
            retries: 3
        });

        const existing = ProviderTemplateSchema.parse(getResponse.data.data);

        const putData: {
            text: string;
            instructions?: string;
            group?: string | null;
            fields?: Array<Record<string, unknown>>;
        } = {
            text: input.text !== undefined ? input.text : existing.text
        };

        if (input.instructions !== undefined) {
            putData.instructions = input.instructions;
        } else if (existing.instructions !== undefined) {
            putData.instructions = existing.instructions;
        }

        const existingGroup = existing.group;
        if (input.group !== undefined) {
            putData.group = input.group;
        } else if (existingGroup !== undefined && existingGroup !== null) {
            putData.group = existingGroup.id;
        }

        if (input.fields !== undefined) {
            const scoreSystemCount = input.fields.filter((field) => field.type === 'score-system').length;
            if (scoreSystemCount !== 1) {
                throw new nango.ActionError({
                    type: 'invalid_input',
                    message: 'A Feedback Template requires exactly 1 field of type score-system.'
                });
            }
            putData.fields = input.fields;
        } else {
            putData.fields = existing.fields.map((field) => {
                const { id: _id, ...rest } = field;
                return rest;
            });
        }

        const putResponse = await nango.put({
            // https://hire.lever.co/developer/documentation#update-a-feedback-template
            endpoint: `/v1/feedback_templates/${encodeURIComponent(input.templateId)}`,
            data: putData,
            retries: 3
        });

        const updated = ProviderTemplateSchema.parse(putResponse.data.data);

        return {
            id: updated.id,
            text: updated.text,
            ...(updated.instructions !== undefined && { instructions: updated.instructions }),
            ...(updated.group !== null && updated.group !== undefined && { group: updated.group }),
            ...(updated.stage !== null && updated.stage !== undefined && { stage: updated.stage }),
            createdAt: updated.createdAt,
            updatedAt: updated.updatedAt,
            fields: updated.fields
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
