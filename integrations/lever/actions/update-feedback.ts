import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    opportunityId: z.string().describe('The opportunity ID. Example: "6408dc54-7015-4e5b-8d60-23afff2b1efc"'),
    feedbackId: z.string().describe('The feedback ID. Example: "60a45740-abb6-4196-9450-bc0ff333e585"'),
    performAs: z.string().describe('The Lever user ID to perform this update on behalf of. Example: "be129d9b-50da-4485-9377-0d83e981f30b"'),
    fieldValues: z
        .array(
            z.object({
                id: z.string().describe('The field ID. Example: "6dbec25a-de8a-43a1-8264-75cefcd2f8c7"'),
                value: z.unknown().describe('The new value for the field.')
            })
        )
        .describe('Array of field ID/value pairs to update on the feedback form.')
});

const ProviderFieldSchema = z
    .object({
        id: z.string(),
        type: z.string().optional(),
        text: z.string().optional(),
        description: z.string().optional(),
        required: z.boolean().optional(),
        prompt: z.string().optional(),
        options: z.array(z.unknown()).optional(),
        isSummary: z.boolean().optional(),
        summaryText: z.string().optional(),
        overall: z.boolean().optional(),
        value: z.unknown().optional()
    })
    .passthrough();

const ProviderFeedbackSchema = z
    .object({
        data: z
            .object({
                id: z.string(),
                accountId: z.string().nullish(),
                createdAt: z.number().nullish(),
                updatedAt: z.number().nullish(),
                userId: z.string().nullish(),
                profileId: z.string().nullish(),
                baseTemplateId: z.string().nullish(),
                text: z.string().nullish(),
                instructions: z.string().nullish(),
                type: z.string().nullish(),
                fields: z.array(ProviderFieldSchema).nullish(),
                completedAt: z.number().nullish(),
                deletedAt: z.number().nullish()
            })
            .passthrough()
    })
    .passthrough();

const OutputSchema = z.object({
    id: z.string(),
    updatedAt: z.number().optional(),
    fields: z
        .array(
            z
                .object({
                    id: z.string(),
                    type: z.string().optional(),
                    text: z.string().optional(),
                    value: z.unknown().optional()
                })
                .passthrough()
        )
        .optional()
});

const action = createAction({
    description: 'Update the field values on an existing feedback form.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['feedback:write:admin', 'opportunities:read:admin'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const getResponse = await nango.get({
            // https://hire.lever.co/developer/documentation#retrieve-a-feedback-form
            endpoint: `/v1/opportunities/${encodeURIComponent(input.opportunityId)}/feedback/${encodeURIComponent(input.feedbackId)}`,
            params: {
                perform_as: input.performAs
            },
            retries: 3
        });

        if (!getResponse.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Feedback not found',
                feedbackId: input.feedbackId,
                opportunityId: input.opportunityId
            });
        }

        const currentFeedback = ProviderFeedbackSchema.parse(getResponse.data);
        const currentFields = currentFeedback.data.fields || [];
        const currentFieldIds = new Set(currentFields.map((field) => field.id));

        for (const fieldValue of input.fieldValues) {
            if (!currentFieldIds.has(fieldValue.id)) {
                throw new nango.ActionError({
                    type: 'invalid_field',
                    message: `Field ${fieldValue.id} does not exist on this feedback form.`,
                    feedbackId: input.feedbackId,
                    fieldId: fieldValue.id
                });
            }
        }

        const putResponse = await nango.put({
            // https://hire.lever.co/developer/documentation#update-feedback
            endpoint: `/v1/opportunities/${encodeURIComponent(input.opportunityId)}/feedback/${encodeURIComponent(input.feedbackId)}`,
            params: {
                perform_as: input.performAs
            },
            data: {
                fieldValues: input.fieldValues
            },
            retries: 1
        });

        const updatedFeedback = ProviderFeedbackSchema.parse(putResponse.data);

        return {
            id: updatedFeedback.data.id,
            ...(typeof updatedFeedback.data.updatedAt === 'number' && { updatedAt: updatedFeedback.data.updatedAt }),
            fields: updatedFeedback.data.fields || []
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
