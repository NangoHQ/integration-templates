import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        incident_id: z.string().describe('The ID of the incident containing the note.'),
        note_id: z.string().describe('The ID of the note to update.'),
        content: z.string().describe('The new content for the note.')
    })
    .describe('Input parameters for updating an incident note.');

const ProviderUserReferenceSchema = z.object({
    id: z.string(),
    type: z.string(),
    summary: z.string().nullable().optional(),
    self: z.string().nullable().optional(),
    html_url: z.string().nullable().optional()
});

const ProviderChannelSchema = z.object({
    summary: z.string(),
    id: z.string().nullable().optional(),
    type: z.string().nullable().optional(),
    self: z.string().nullable().optional(),
    html_url: z.string().nullable().optional()
});

const ProviderNoteSchema = z.object({
    id: z.string(),
    user: ProviderUserReferenceSchema,
    channel: ProviderChannelSchema,
    content: z.string(),
    created_at: z.string(),
    updated_at: z.string()
});

const ProviderOutputSchema = z.object({
    note: ProviderNoteSchema
});

const UserReferenceSchema = z
    .object({
        id: z.string().describe('The user ID.'),
        type: z.string().describe('The reference type, such as user_reference or bot_user_reference.'),
        summary: z.string().optional().describe('A short summary of the user.'),
        self: z.string().optional().describe('The API URL for the user.'),
        html_url: z.string().optional().describe('The URL to view the user in the PagerDuty web app.')
    })
    .describe('A reference to the user who created or last updated the note.');

const ChannelSchema = z
    .object({
        summary: z.string().describe('A description of the channel used to create the note, such as The PagerDuty website or APIs.'),
        id: z.string().optional().describe('The channel ID.'),
        type: z.string().optional().describe('The channel type.'),
        self: z.string().optional().describe('The API URL for the channel.'),
        html_url: z.string().optional().describe('The URL to view the channel in the PagerDuty web app.')
    })
    .describe('The channel through which the note was created.');

const NoteSchema = z
    .object({
        id: z.string().describe('The note ID.'),
        user: UserReferenceSchema.describe('The user who created or last updated the note.'),
        channel: ChannelSchema.describe('The channel through which the note was created.'),
        content: z.string().describe('The note content.'),
        created_at: z.string().describe('ISO 8601 timestamp indicating when the note was created.'),
        updated_at: z.string().describe('ISO 8601 timestamp indicating when the note was last updated.')
    })
    .describe('An incident note object.');

const OutputSchema = z
    .object({
        note: NoteSchema.describe('The updated incident note.')
    })
    .describe('Output containing the updated incident note.');

/**
 * @tags: [write]
 * @tagReason: Updates the content of an existing incident note via PUT.
 */
const action = createAction({
    description: 'Update the content of an existing incident note.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['incidents.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.put({
            // https://developer.pagerduty.com/api-reference/0e330d2b5fbf2-update-a-note-on-an-incident
            endpoint: `/incidents/${encodeURIComponent(input.incident_id)}/notes/${encodeURIComponent(input.note_id)}`,
            data: {
                note: {
                    content: input.content
                }
            },
            headers: {
                From: 'api@nango.dev'
            },
            retries: 3
        });

        const providerResponse = ProviderOutputSchema.parse(response.data);

        const normalizeReference = (ref: z.infer<typeof ProviderUserReferenceSchema>) => ({
            id: ref.id,
            type: ref.type,
            ...(ref.summary != null && { summary: ref.summary }),
            ...(ref.self != null && { self: ref.self }),
            ...(ref.html_url != null && { html_url: ref.html_url })
        });

        const normalizeChannel = (ch: z.infer<typeof ProviderChannelSchema>) => ({
            summary: ch.summary,
            ...(ch.id != null && { id: ch.id }),
            ...(ch.type != null && { type: ch.type }),
            ...(ch.self != null && { self: ch.self }),
            ...(ch.html_url != null && { html_url: ch.html_url })
        });

        return {
            note: {
                id: providerResponse.note.id,
                user: normalizeReference(providerResponse.note.user),
                channel: normalizeChannel(providerResponse.note.channel),
                content: providerResponse.note.content,
                created_at: providerResponse.note.created_at,
                updated_at: providerResponse.note.updated_at
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
