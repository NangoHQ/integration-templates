import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    opportunityId: z.string().describe('The opportunity ID. Example: "6408dc54-7015-4e5b-8d60-23afff2b1efc"'),
    noteId: z.string().describe('The note ID. Example: "2c506ee0-f99f-4aff-b556-76e003efb5ea"')
});

const ProviderNoteSchema = z
    .object({
        id: z.string(),
        text: z.string().nullish(),
        fields: z.unknown().array().nullish(),
        user: z.string().nullish(),
        secret: z.boolean().nullish(),
        completedAt: z.number().nullish(),
        createdAt: z.number().nullish(),
        deletedAt: z.number().nullish()
    })
    .passthrough();

const OutputSchema = z
    .object({
        id: z.string(),
        text: z.string().optional(),
        fields: z.unknown().array().optional(),
        user: z.string().optional(),
        secret: z.boolean().optional(),
        completedAt: z.number().optional(),
        createdAt: z.number().optional(),
        deletedAt: z.number().optional()
    })
    .passthrough();

const LeverResponseSchema = z.object({
    data: z.unknown()
});

const action = createAction({
    description: 'Retrieve a single note on an opportunity.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['notes:read:admin'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://hire.lever.co/developer/documentation#retrieve-a-single-note
            endpoint: `/v1/opportunities/${encodeURIComponent(input.opportunityId)}/notes/${encodeURIComponent(input.noteId)}`,
            retries: 3
        });

        const wrapper = LeverResponseSchema.parse(response.data);
        const providerNote = ProviderNoteSchema.parse(wrapper.data);

        return {
            id: providerNote.id,
            ...(providerNote.text != null && { text: providerNote.text }),
            ...(providerNote.fields != null && { fields: providerNote.fields }),
            ...(providerNote.user != null && { user: providerNote.user }),
            ...(providerNote.secret != null && { secret: providerNote.secret }),
            ...(providerNote.completedAt != null && { completedAt: providerNote.completedAt }),
            ...(providerNote.createdAt != null && { createdAt: providerNote.createdAt }),
            ...(providerNote.deletedAt != null && { deletedAt: providerNote.deletedAt })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
