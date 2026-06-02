import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    note: z.string().describe('Text content of the note. Example: "Follow up with lead next week"'),
    relid: z.number().describe('ID of the related record. Example: 1'),
    reltype: z.enum(['Activity', 'Deal', 'DealTask', 'Subscriber', 'CustomerAccount']).describe('Type of related object. Example: "Subscriber"')
});

const ProviderNoteSchema = z.object({
    id: z.string(),
    note: z.string().optional(),
    reltype: z.string().optional(),
    relid: z.number().optional(),
    userid: z.string().optional(),
    user: z.string().optional(),
    cdate: z.string().optional(),
    mdate: z.string().optional(),
    owner: z
        .object({
            type: z.string().optional(),
            id: z.number().optional()
        })
        .optional()
});

const ProviderCreateNoteResponseSchema = z.object({
    note: ProviderNoteSchema
});

const OutputSchema = z.object({
    id: z.string(),
    note: z.string().optional(),
    reltype: z.string().optional(),
    relid: z.number().optional(),
    userid: z.string().optional(),
    user: z.string().optional(),
    cdate: z.string().optional(),
    mdate: z.string().optional(),
    owner: z
        .object({
            type: z.string().optional(),
            id: z.number().optional()
        })
        .optional()
});

const action = createAction({
    description: 'Create a note in ActiveCampaign.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-note',
        group: 'Notes'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.activecampaign.com/reference/create-a-note
            endpoint: '/3/notes',
            data: {
                note: {
                    note: input.note,
                    relid: input.relid,
                    reltype: input.reltype
                }
            },
            retries: 3
        });

        const parsed = ProviderCreateNoteResponseSchema.parse(response.data);
        const providerNote = parsed.note;

        return {
            id: providerNote.id,
            ...(providerNote.note !== undefined && { note: providerNote.note }),
            ...(providerNote.reltype !== undefined && { reltype: providerNote.reltype }),
            ...(providerNote.relid !== undefined && { relid: providerNote.relid }),
            ...(providerNote.userid !== undefined && { userid: providerNote.userid }),
            ...(providerNote.user !== undefined && { user: providerNote.user }),
            ...(providerNote.cdate !== undefined && { cdate: providerNote.cdate }),
            ...(providerNote.mdate !== undefined && { mdate: providerNote.mdate }),
            ...(providerNote.owner !== undefined && { owner: providerNote.owner })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
