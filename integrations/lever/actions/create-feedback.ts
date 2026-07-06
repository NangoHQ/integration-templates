import { z } from 'zod';
import { createAction, type ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    opportunityId: z.string().describe('The ID of the opportunity to create feedback on. Example: "6408dc54-7015-4e5b-8d60-23afff2b1efc"'),
    baseTemplateId: z.string().describe('The ID of the feedback template to use. Example: "1c0d54d3-1aeb-4989-b616-d0a6025444e8"'),
    performAs: z.string().describe('The ID of the user to perform the action as. Example: "be129d9b-50da-4485-9377-0d83e981f30b"')
});

const ProviderFieldSchema = z
    .object({
        id: z.string(),
        type: z.string(),
        text: z.string().optional(),
        description: z.string().optional(),
        required: z.boolean().optional(),
        prompt: z.string().optional(),
        options: z.array(z.object({ text: z.string() }).passthrough()).optional(),
        value: z.unknown().optional()
    })
    .passthrough();

const ProviderFeedbackSchema = z
    .object({
        id: z.string(),
        baseTemplateId: z.string(),
        type: z.string().optional(),
        text: z.string().optional(),
        instructions: z.string().optional(),
        user: z.string().nullable().optional(),
        createdAt: z.number().nullable().optional(),
        completedAt: z.number().nullable().optional(),
        updatedAt: z.number().nullable().optional(),
        deletedAt: z.number().nullable().optional(),
        interview: z.string().nullable().optional(),
        panel: z.string().nullable().optional(),
        fields: z.array(ProviderFieldSchema).optional()
    })
    .passthrough();

const OutputFieldSchema = z.object({
    id: z.string(),
    type: z.string(),
    text: z.string().optional(),
    description: z.string().optional(),
    required: z.boolean().optional(),
    prompt: z.string().optional(),
    options: z.array(z.object({ text: z.string() }).passthrough()).optional(),
    value: z.unknown().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    baseTemplateId: z.string(),
    type: z.string().optional(),
    text: z.string().optional(),
    instructions: z.string().optional(),
    user: z.string().optional(),
    createdAt: z.number().optional(),
    completedAt: z.number().optional(),
    updatedAt: z.number().optional(),
    deletedAt: z.number().optional(),
    interview: z.string().optional(),
    panel: z.string().optional(),
    fields: z.array(OutputFieldSchema).optional()
});

const action = createAction({
    description: 'Create a feedback form on an opportunity from a feedback template.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://hire.lever.co/developer/documentation
            endpoint: `/v1/opportunities/${encodeURIComponent(input.opportunityId)}/feedback`,
            params: {
                perform_as: input.performAs
            },
            data: {
                baseTemplateId: input.baseTemplateId
            },
            retries: 3
        };

        const response = await nango.post(config);
        const rawData = response.data;

        const wrapperResult = z.safeParse(z.object({ data: ProviderFeedbackSchema }), rawData);
        const providerFeedback = wrapperResult.success ? wrapperResult.data.data : ProviderFeedbackSchema.parse(rawData);

        return {
            id: providerFeedback.id,
            baseTemplateId: providerFeedback.baseTemplateId,
            ...(providerFeedback.type != null && { type: providerFeedback.type }),
            ...(providerFeedback.text != null && { text: providerFeedback.text }),
            ...(providerFeedback.instructions != null && { instructions: providerFeedback.instructions }),
            ...(providerFeedback.user != null && { user: providerFeedback.user }),
            ...(providerFeedback.createdAt != null && { createdAt: providerFeedback.createdAt }),
            ...(providerFeedback.completedAt != null && { completedAt: providerFeedback.completedAt }),
            ...(providerFeedback.updatedAt != null && { updatedAt: providerFeedback.updatedAt }),
            ...(providerFeedback.deletedAt != null && { deletedAt: providerFeedback.deletedAt }),
            ...(providerFeedback.interview != null && { interview: providerFeedback.interview }),
            ...(providerFeedback.panel != null && { panel: providerFeedback.panel }),
            ...(providerFeedback.fields != null && {
                fields: providerFeedback.fields.map((field) => ({
                    id: field.id,
                    type: field.type,
                    ...(field.text != null && { text: field.text }),
                    ...(field.description != null && { description: field.description }),
                    ...(field.required != null && { required: field.required }),
                    ...(field.prompt != null && { prompt: field.prompt }),
                    ...(field.options != null && { options: field.options }),
                    ...(field.value != null && { value: field.value })
                }))
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
