import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        incident_id: z.string().describe('The PagerDuty incident ID. Example: "Q0YLGGHWAI1DDT"')
    })
    .describe('Input for listing notes on a PagerDuty incident.');

const ProviderNoteSchema = z.object({
    id: z.string(),
    type: z.string(),
    summary: z.string().optional(),
    self: z.string().optional(),
    html_url: z.string().optional(),
    content: z.string().optional(),
    created_at: z.string().optional(),
    channel: z.record(z.string(), z.unknown()).optional(),
    user: z
        .object({
            id: z.string().optional(),
            type: z.string().optional(),
            summary: z.string().optional(),
            self: z.string().optional(),
            html_url: z.string().optional()
        })
        .optional()
});

const NoteSchema = z.object({
    id: z.string().describe('The unique identifier of the note.'),
    type: z.string().describe('The PagerDuty resource type.'),
    summary: z.string().optional().describe('A summary of the note.'),
    self: z.string().optional().describe('The API URL of the note resource.'),
    html_url: z.string().optional().describe('The PagerDuty web UI URL of the note.'),
    content: z.string().optional().describe('The text content of the note.'),
    created_at: z.string().optional().describe('ISO 8601 timestamp when the note was created.'),
    channel: z.record(z.string(), z.unknown()).optional().describe('The channel through which the note was created.'),
    user: z
        .object({
            id: z.string().optional().describe('The ID of the user who created the note.'),
            type: z.string().optional().describe('The resource type of the user.'),
            summary: z.string().optional().describe('A summary of the user.'),
            self: z.string().optional().describe('The API URL of the user resource.'),
            html_url: z.string().optional().describe('The PagerDuty web UI URL of the user.')
        })
        .optional()
        .describe('The user who authored the note.')
});

const OutputSchema = z
    .object({
        notes: z.array(NoteSchema).describe('Array of notes on the incident.')
    })
    .describe('Output containing the list of notes for a PagerDuty incident.');

/**
 * @tags: [read]
 * @tagReason: Reads incident notes from the PagerDuty API.
 */
const action = createAction({
    description: 'List notes (annotations) on an incident',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['incidents.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.pagerduty.com/api-reference/
            endpoint: `/incidents/${encodeURIComponent(input.incident_id)}/notes`,
            retries: 3
        });

        const providerNotesResponse = z
            .object({
                notes: z.array(ProviderNoteSchema)
            })
            .parse(response.data);

        return {
            notes: providerNotesResponse.notes.map((note) => ({
                id: note.id,
                type: note.type,
                ...(note.summary !== undefined && { summary: note.summary }),
                ...(note.self !== undefined && { self: note.self }),
                ...(note.html_url !== undefined && { html_url: note.html_url }),
                ...(note.content !== undefined && { content: note.content }),
                ...(note.created_at !== undefined && { created_at: note.created_at }),
                ...(note.channel !== undefined && { channel: note.channel }),
                ...(note.user !== undefined && { user: note.user })
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
