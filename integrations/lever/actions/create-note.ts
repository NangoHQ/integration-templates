import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    opportunityId: z.string().describe('Opportunity ID to attach the note to. Example: "6408dc54-7015-4e5b-8d60-23afff2b1efc"'),
    value: z.string().describe('Content of the note.'),
    perform_as: z.string().optional().describe('Lever user ID to attribute the note to.'),
    note_id: z.string().optional().describe('Existing note ID to update instead of creating a new note.'),
    secret: z.boolean().optional().describe('Whether the note is secret.'),
    score: z.number().optional().describe('Score value for the note.'),
    notifyFollowers: z.boolean().optional().describe('Whether to notify followers of the note.'),
    createdAt: z.number().optional().describe('Timestamp when the note was created.')
});

const ProviderNoteResponseSchema = z.object({
    data: z
        .object({
            id: z.string(),
            text: z.string().nullish(),
            fields: z.array(z.unknown()).nullish(),
            user: z.string().nullish(),
            secret: z.boolean().nullish(),
            completedAt: z.number().nullish(),
            createdAt: z.number().nullish(),
            deletedAt: z.number().nullish()
        })
        .optional()
});

const OutputSchema = z.object({
    id: z.string(),
    text: z.string().nullish(),
    fields: z.array(z.unknown()).nullish(),
    user: z.string().nullish(),
    secret: z.boolean().nullish(),
    completedAt: z.number().nullish(),
    createdAt: z.number().nullish(),
    deletedAt: z.number().nullish()
});

const action = createAction({
    description: 'Action to create a note and add it to an opportunity.',
    version: '3.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['notes:write:admin'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (!input.opportunityId) {
            throw new nango.ActionError({
                message: 'opportunity id is a required field'
            });
        } else if (!input.value) {
            throw new nango.ActionError({
                message: 'value of the note is a required field'
            });
        }

        const postData = {
            value: input.value,
            secret: input.secret,
            score: input.score,
            notifyFollowers: input.notifyFollowers,
            createdAt: input.createdAt
        };

        const config: ProxyConfiguration = {
            // https://hire.lever.co/developer/documentation
            endpoint: `/v1/opportunities/${encodeURIComponent(input.opportunityId)}/notes`,
            params: {
                ...(input.perform_as !== undefined && { perform_as: input.perform_as }),
                ...(input.note_id !== undefined && { note_id: input.note_id })
            },
            data: postData,
            retries: 3
        };

        const response = await nango.post(config);

        const providerResponse = ProviderNoteResponseSchema.parse(response.data);

        if (!providerResponse.data) {
            throw new nango.ActionError({
                message: 'Invalid response from Lever API: missing data field'
            });
        }

        return {
            id: providerResponse.data.id,
            text: providerResponse.data.text,
            fields: providerResponse.data.fields,
            user: providerResponse.data.user,
            secret: providerResponse.data.secret,
            completedAt: providerResponse.data.completedAt,
            createdAt: providerResponse.data.createdAt,
            deletedAt: providerResponse.data.deletedAt
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
