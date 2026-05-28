import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Note ID. Example: "1"')
});

const ProviderNoteSchema = z.object({
    id: z.string(),
    relid: z.string().optional(),
    reltype: z.string().optional(),
    userid: z.string().optional(),
    cdate: z.string().optional(),
    mdate: z.string().optional(),
    note: z.string().optional(),
    user: z.string().optional(),
    owner: z.record(z.string(), z.unknown()).optional(),
    links: z.record(z.string(), z.unknown()).optional()
});

const OutputSchema = z.object({
    id: z.string(),
    relid: z.string().optional(),
    reltype: z.string().optional(),
    userid: z.string().optional(),
    cdate: z.string().optional(),
    mdate: z.string().optional(),
    note: z.string().optional(),
    user: z.string().optional(),
    owner: z.record(z.string(), z.unknown()).optional(),
    links: z.record(z.string(), z.unknown()).optional()
});

const action = createAction({
    description: 'Retrieve a single note from ActiveCampaign.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-note',
        group: 'Notes'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.activecampaign.com/reference/retrieve-a-note
        const response = await nango.get({
            endpoint: `/3/notes/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        const responseSchema = z.object({
            note: z.unknown()
        });

        const parsedResponse = responseSchema.safeParse(response.data);
        if (!parsedResponse.success) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Note not found',
                id: input.id
            });
        }

        const providerNote = ProviderNoteSchema.parse(parsedResponse.data.note);

        return {
            id: providerNote.id,
            ...(providerNote.relid !== undefined && { relid: providerNote.relid }),
            ...(providerNote.reltype !== undefined && { reltype: providerNote.reltype }),
            ...(providerNote.userid !== undefined && { userid: providerNote.userid }),
            ...(providerNote.cdate !== undefined && { cdate: providerNote.cdate }),
            ...(providerNote.mdate !== undefined && { mdate: providerNote.mdate }),
            ...(providerNote.note !== undefined && { note: providerNote.note }),
            ...(providerNote.user !== undefined && { user: providerNote.user }),
            ...(providerNote.owner !== undefined && { owner: providerNote.owner }),
            ...(providerNote.links !== undefined && { links: providerNote.links })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
