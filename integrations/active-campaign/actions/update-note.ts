import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Note ID. Example: "1"'),
    note: z.string().describe('Note text. Example: "Updated note content"'),
    relid: z.string().optional().describe('Related record ID. Example: "1"'),
    reltype: z.string().optional().describe('Related record type. Example: "Subscriber"')
});

const OwnerSchema = z.object({
    type: z.string().optional(),
    id: z.union([z.string(), z.number()]).optional()
});

const ProviderNoteSchema = z.object({
    id: z.string(),
    note: z.string(),
    relid: z.union([z.string(), z.number(), z.null()]).optional(),
    reltype: z.string().optional(),
    userid: z.string().optional(),
    cdate: z.string().optional(),
    mdate: z.string().optional(),
    user: z.string().optional(),
    owner: OwnerSchema.optional(),
    links: z.record(z.string(), z.string()).optional()
});

const OutputSchema = z.object({
    id: z.string(),
    note: z.string(),
    relid: z.string().optional(),
    reltype: z.string().optional(),
    userid: z.string().optional(),
    cdate: z.string().optional(),
    mdate: z.string().optional(),
    user: z.string().optional(),
    owner: z
        .object({
            type: z.string().optional(),
            id: z.string().optional()
        })
        .optional()
});

const action = createAction({
    description: 'Update a note in ActiveCampaign',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-note',
        group: 'Notes'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const notePayload: { note: string; relid?: string; reltype?: string } = {
            note: input.note
        };

        if (input.relid !== undefined) {
            notePayload.relid = input.relid;
        }

        if (input.reltype !== undefined) {
            notePayload.reltype = input.reltype;
        }

        // https://developers.activecampaign.com/reference/update-a-note
        const response = await nango.patch({
            endpoint: `/3/notes/${encodeURIComponent(input.id)}`,
            data: {
                note: notePayload
            },
            retries: 3
        });

        const providerResponse = z
            .object({
                note: ProviderNoteSchema
            })
            .parse(response.data);

        const providerNote = providerResponse.note;

        return {
            id: providerNote.id,
            note: providerNote.note,
            ...(providerNote.relid != null && { relid: String(providerNote.relid) }),
            ...(providerNote.reltype != null && { reltype: providerNote.reltype }),
            ...(providerNote.userid != null && { userid: providerNote.userid }),
            ...(providerNote.cdate != null && { cdate: providerNote.cdate }),
            ...(providerNote.mdate != null && { mdate: providerNote.mdate }),
            ...(providerNote.user != null && { user: providerNote.user }),
            ...(providerNote.owner != null && {
                owner: {
                    ...(providerNote.owner.type != null && { type: providerNote.owner.type }),
                    ...(providerNote.owner.id != null && { id: String(providerNote.owner.id) })
                }
            })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
