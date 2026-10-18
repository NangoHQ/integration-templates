import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        presentationId: z.string().describe('The ID of the presentation to modify. Example: "1XFaFcivdWdl-Em5A8HC0_Oua7fSWpw-MR_QDj1AHsPI"'),
        searchText: z.string().describe('The text to search for, or a regular expression pattern when regex is true. Example: "Nango"'),
        replacementText: z.string().describe('The text to replace each match with. Example: "Hello World"'),
        matchCase: z.boolean().optional().describe('Whether the search is case-sensitive. Defaults to false.'),
        regex: z.boolean().optional().describe('Whether searchText is a regular expression pattern instead of literal text. Defaults to false.'),
        pageObjectIds: z
            .array(z.string())
            .optional()
            .describe('Slide (page) object IDs to scope the replacement to. If omitted, the replacement applies to every slide in the presentation.')
    })
    .describe('Input for replacing every match of a string across a presentation or specific slides.');

const BatchUpdateResponseSchema = z.object({
    presentationId: z.string(),
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

const OutputSchema = z
    .object({
        presentationId: z.string().describe('The ID of the presentation that was modified.'),
        occurrencesChanged: z.number().describe('The number of occurrences that were replaced. Zero when nothing matched.'),
        revisionId: z.string().optional().describe('The revision ID of the presentation after the update, when returned by the provider.')
    })
    .describe('Result of the text replacement, including how many occurrences were changed.');

/**
 * @tags: [write, destructive]
 * @tagReason: Replaces matching text in place across the presentation, overwriting existing content in a way that is not automatically reversible.
 * @pitfalls: Replacing text modifies the presentation in place and cannot be undone; when nothing matches the provider omits occurrencesChanged, which this action reports as 0; pageObjectIds must be slide IDs, not individual page-element IDs.
 */
const action = createAction({
    description: 'Find and replace all matches of a string (optionally as a regex) across a presentation or specific slides.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/presentations'],

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
                    ...(input.pageObjectIds && input.pageObjectIds.length > 0 && { pageObjectIds: input.pageObjectIds })
                }
            }
        ];

        const response = await nango.post({
            // https://developers.google.com/slides/api/reference/rest/v1/presentations/batchUpdate
            endpoint: `/v1/presentations/${encodeURIComponent(input.presentationId)}:batchUpdate`,
            data: {
                requests
            },
            retries: 3
        });

        const parsed = BatchUpdateResponseSchema.parse(response.data);
        const firstReply = parsed.replies[0];
        const occurrencesChanged = firstReply?.replaceAllText?.occurrencesChanged ?? 0;

        return {
            presentationId: parsed.presentationId,
            occurrencesChanged,
            ...(parsed.writeControl?.requiredRevisionId && { revisionId: parsed.writeControl.requiredRevisionId })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
