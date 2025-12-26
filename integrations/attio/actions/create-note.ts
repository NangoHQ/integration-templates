/**
 * Instructions: Creates a note on a record.
 * API: https://docs.attio.com/rest-api/endpoint-reference/notes/create-a-note
 */

import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

// Inline schema definitions
const CreateNoteInput = z.object({
    parent_object: z.string().describe('The object type of the parent record. Example: "people" or "companies"'),
    parent_record_id: z.string().describe('The record ID to attach the note to. Example: "5829dd6c-0577-40dc-a858-8bd9a0d6aa58"'),
    title: z.string().describe('The note title. Example: "Meeting Notes"'),
    content: z.string().describe('The note content in plain text or markdown. Example: "Discussed Q4 planning..."')
});

const NoteId = z.object({
    workspace_id: z.string(),
    note_id: z.string()
});

const CreateNoteOutput = z.object({
    data: z.object({
        id: NoteId,
        title: z.string(),
        content_plaintext: z.string(),
        parent_object: z.string(),
        parent_record_id: z.string(),
        created_at: z.string()
    })
});

const action = createAction({
    description: 'Creates a note on a record.',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/notes',
        group: 'Notes'
    },

    input: CreateNoteInput,
    output: CreateNoteOutput,
    scopes: ['note:read-write'],

    exec: async (nango, input): Promise<z.infer<typeof CreateNoteOutput>> => {
        const config: ProxyConfiguration = {
            // https://docs.attio.com/rest-api/endpoint-reference/notes/create-a-note
            endpoint: 'v2/notes',
            data: {
                data: {
                    parent_object: input.parent_object,
                    parent_record_id: input.parent_record_id,
                    title: input.title,
                    format: 'plaintext',
                    content: input.content
                }
            },
            retries: 3
        };

        const response = await nango.post(config);

        return {
            data: {
                id: {
                    workspace_id: response.data.data.id.workspace_id,
                    note_id: response.data.data.id.note_id
                },
                title: response.data.data.title,
                content_plaintext: response.data.data.content_plaintext,
                parent_object: response.data.data.parent_object,
                parent_record_id: response.data.data.parent_record_id,
                created_at: response.data.data.created_at
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
