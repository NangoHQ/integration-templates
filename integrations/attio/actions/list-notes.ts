/**
 * Instructions: Lists notes for a record.
 * API: https://docs.attio.com/rest-api/endpoint-reference/notes/list-notes
 */

import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

// Inline schema definitions
const ListNotesInput = z.object({
    parent_object: z.string().describe('The object type of the parent record. Example: "people" or "companies"'),
    parent_record_id: z.string().describe('The record ID to list notes for. Example: "5829dd6c-0577-40dc-a858-8bd9a0d6aa58"'),
    limit: z.number().optional().describe('Maximum number of notes to return'),
    offset: z.number().optional().describe('Number of notes to skip')
});

const NoteId = z.object({
    workspace_id: z.string(),
    note_id: z.string()
});

const Note = z.object({
    id: NoteId,
    title: z.union([z.string(), z.null()]),
    content_plaintext: z.string(),
    parent_object: z.string(),
    parent_record_id: z.string(),
    created_at: z.string()
});

const ListNotesOutput = z.object({
    data: z.array(Note).describe('Array of notes')
});

const action = createAction({
    description: 'Lists notes for a record.',
    version: '1.0.0',

    endpoint: {
        method: 'GET',
        path: '/notes',
        group: 'Notes'
    },

    input: ListNotesInput,
    output: ListNotesOutput,
    scopes: ['note:read'],

    exec: async (nango, input): Promise<z.infer<typeof ListNotesOutput>> => {
        const config: ProxyConfiguration = {
            // https://docs.attio.com/rest-api/endpoint-reference/notes/list-notes
            endpoint: 'v2/notes',
            params: {
                parent_object: input.parent_object,
                parent_record_id: input.parent_record_id,
                ...(input.limit && { limit: input.limit.toString() }),
                ...(input.offset && { offset: input.offset.toString() })
            },
            retries: 3
        };

        const response = await nango.get(config);

        return {
            data: response.data.data.map((note: any) => ({
                id: {
                    workspace_id: note.id.workspace_id,
                    note_id: note.id.note_id
                },
                title: note.title ?? null,
                content_plaintext: note.content_plaintext,
                parent_object: note.parent_object,
                parent_record_id: note.parent_record_id,
                created_at: note.created_at
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
