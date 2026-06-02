import { z } from 'zod';
import { createAction } from 'nango';

const NoteTypeSchema = z.enum(['text/plain', 'text/html']);

const InputSchema = z.object({
    candidateId: z.string().describe('Candidate ID. Example: "e9ed20fd-d45f-4aad-8a00-a19bfba0083e"'),
    note: z.string().describe('The note content to add.'),
    noteType: NoteTypeSchema.optional().describe('Content type of the note. Defaults to text/plain.'),
    sendNotifications: z.boolean().optional().describe('Whether subscribed users should be notified. Defaults to false.'),
    isPrivate: z.boolean().optional().describe('Whether the note should be marked as private. Defaults to false.'),
    createdAt: z.string().optional().describe('Optional ISO 8601 timestamp for when the note was created.')
});

const AuthorSchema = z.object({
    id: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    email: z.string()
});

const ProviderNoteSchema = z.object({
    id: z.string(),
    createdAt: z.string(),
    isPrivate: z.boolean(),
    content: z.string(),
    author: AuthorSchema
});

const ProviderResponseSchema = z.object({
    success: z.boolean(),
    results: ProviderNoteSchema.optional(),
    errors: z.array(z.unknown()).optional()
});

const OutputSchema = z.object({
    id: z.string(),
    candidateId: z.string(),
    createdAt: z.string(),
    isPrivate: z.boolean(),
    content: z.string(),
    author: z.object({
        id: z.string(),
        firstName: z.string(),
        lastName: z.string(),
        email: z.string()
    })
});

const action = createAction({
    description: 'Create a candidate note in Ashby.',
    version: '2.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-note',
        group: 'Candidates'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['candidatesWrite'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const notePayload = input.noteType === 'text/html' ? { type: 'text/html', value: input.note } : input.note;

        const response = await nango.post({
            // https://developers.ashbyhq.com/reference/candidatecreatenote
            endpoint: '/candidate.createNote',
            data: {
                candidateId: input.candidateId,
                note: notePayload,
                ...(input.sendNotifications !== undefined && { sendNotifications: input.sendNotifications }),
                ...(input.isPrivate !== undefined && { isPrivate: input.isPrivate }),
                ...(input.createdAt !== undefined && { createdAt: input.createdAt })
            },
            retries: 10
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (!providerResponse.success || !providerResponse.results) {
            const errorMessages = providerResponse.errors?.map((err) => (typeof err === 'string' ? err : JSON.stringify(err)));
            throw new nango.ActionError({
                type: 'provider_error',
                message: errorMessages?.join(', ') || 'Failed to create note.',
                candidateId: input.candidateId
            });
        }

        return {
            id: providerResponse.results.id,
            candidateId: input.candidateId,
            createdAt: providerResponse.results.createdAt,
            isPrivate: providerResponse.results.isPrivate,
            content: providerResponse.results.content,
            author: {
                id: providerResponse.results.author.id,
                firstName: providerResponse.results.author.firstName,
                lastName: providerResponse.results.author.lastName,
                email: providerResponse.results.author.email
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
