import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    documentId: z.string().describe('The ID of the document to modify. Example: "1Kj3d86Z-Sfd56YP4dImQ-ggMRyP2QZ_BRO33zOO224c"'),
    searchText: z.string().describe('The text to search for, or a regex pattern if regex is true. Example: "Nango"'),
    replacementText: z.string().describe('The text to replace with. Example: "Hello World"'),
    matchCase: z.boolean().optional().describe('Whether the search is case-sensitive. Defaults to false.'),
    regex: z.boolean().optional().describe('Whether searchText is a regex pattern. Defaults to false.'),
    tabId: z.string().optional().describe('The tab ID to scope the replacement to. If omitted, applies to all tabs.')
});

const BatchUpdateResponseSchema = z.object({
    documentId: z.string(),
    replies: z.array(
        z.object({
            replaceAllText: z
                .object({
                    occurrencesChanged: z.number().optional()
                })
                .optional()
        })
    ),
    writeControl: z
        .object({
            requiredRevisionId: z.string().optional()
        })
        .optional()
});

const OutputSchema = z.object({
    occurrencesChanged: z.number().describe('The number of occurrences that were changed.'),
    documentId: z.string().describe('The ID of the modified document.'),
    revisionId: z.string().optional().describe('The revision ID of the document after the update.')
});

const action = createAction({
    description: 'Replace all matches of a string or regex in a document.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['documents', 'drive.file'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requests: Array<Record<string, unknown>> = [
            {
                replaceAllText: {
                    containsText: {
                        text: input.searchText,
                        matchCase: input.matchCase ?? false,
                        ...(input.regex && { searchByRegex: true })
                    },
                    replaceText: input.replacementText,
                    ...(input.tabId && {
                        tabsCriteria: {
                            tabIds: [input.tabId]
                        }
                    })
                }
            }
        ];

        const response = await nango.post({
            // https://developers.google.com/docs/api/reference/rest/v1/documents/batchUpdate
            endpoint: `/v1/documents/${encodeURIComponent(input.documentId)}:batchUpdate`,
            data: {
                requests
            },
            retries: 3
        });

        const parsed = BatchUpdateResponseSchema.parse(response.data);
        const firstReply = parsed.replies[0];
        const occurrencesChanged = firstReply?.replaceAllText?.occurrencesChanged ?? 0;

        return {
            documentId: parsed.documentId,
            occurrencesChanged,
            ...(parsed.writeControl?.requiredRevisionId && { revisionId: parsed.writeControl.requiredRevisionId })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
