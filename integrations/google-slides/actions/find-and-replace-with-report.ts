import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        presentationId: z.string().describe('The ID of the presentation to search and replace within. Example: "1XFaFcivdWdl-Em5A8HC0_Oua7fSWpw-MR_QDj1AHsPI"'),
        searchText: z.string().min(1).describe('Literal text to find. Example: "Nango Composite Title"'),
        replaceText: z.string().describe('Text that replaces every occurrence of searchText. Example: "Nango Composite Heading"'),
        matchCase: z.boolean().optional().describe('Whether the search is case-sensitive. Defaults to false (case-insensitive).'),
        pageObjectIds: z
            .array(z.string())
            .optional()
            .describe('Restrict the replacement to these slide/page object IDs. Omit to replace across the whole presentation. Example: ["slide_test_1"]')
    })
    .describe('Text to find and replace, optionally scoped to specific slides.');

const OutputSchema = z
    .object({
        occurrencesChanged: z.number().describe('Occurrences the provider reported replacing; 0 when the provider reply omits the field.'),
        preCount: z.number().describe('Occurrences of searchText found in the presentation before the update.'),
        postSearchTextCount: z.number().describe('Occurrences of searchText remaining after the update; expected to be 0 for an unscoped replacement.'),
        postReplaceTextCount: z.number().describe('Occurrences of replaceText present in the presentation after the update.')
    })
    .describe('The replacement count reported by the provider alongside independent before/after occurrence counts.');

const BatchUpdateReplySchema = z.object({
    replies: z
        .array(
            z.object({
                replaceAllText: z
                    .object({
                        occurrencesChanged: z.number().optional()
                    })
                    .optional()
            })
        )
        .optional()
});

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function buildSearchableContent(data: unknown, pageObjectIds: string[] | undefined): string {
    if (pageObjectIds === undefined || pageObjectIds.length === 0) {
        return JSON.stringify(data);
    }
    const wanted = new Set(pageObjectIds);
    const slides = isRecord(data) && Array.isArray(data['slides']) ? data['slides'] : [];
    const scoped = slides.filter((slide) => isRecord(slide) && typeof slide['objectId'] === 'string' && wanted.has(slide['objectId']));
    return JSON.stringify(scoped);
}

function countOccurrences(haystack: string, needle: string, matchCase: boolean): number {
    if (needle.length === 0) {
        return 0;
    }
    const searchable = matchCase ? haystack : haystack.toLowerCase();
    const target = matchCase ? needle : needle.toLowerCase();
    let count = 0;
    let index = searchable.indexOf(target);
    while (index !== -1) {
        count += 1;
        index = searchable.indexOf(target, index + target.length);
    }
    return count;
}

/**
 * @tags: [read, write]
 * @tagReason: Reads the presentation before and after the update, and mutates it by replacing matching text.
 * @pitfalls: The replacement is permanent (the Slides API offers no undo), and a pageObjectIds-scoped replacement leaves matching text on other slides, so postSearchTextCount can stay above 0 even when occurrencesChanged is non-zero.
 */
const action = createAction({
    description:
        'Replace all occurrences of text across a presentation (or specific slides) and report the replacement count with independent before/after counts.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/presentations'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const endpoint = `/v1/presentations/${encodeURIComponent(input.presentationId)}`;
        const matchCase = input.matchCase ?? false;

        // The before/after reads hit the same path; a distinct Google system param (quotaUser) keeps each
        // request identifiable so recorded mocks replay deterministically. Google accepts any opaque string.
        // https://developers.google.com/slides/api/reference/rest/v1/presentations/get
        const beforeResponse = await nango.get({
            endpoint,
            params: { quotaUser: 'find-and-replace-pre' },
            retries: 3
        });

        const preCount = countOccurrences(buildSearchableContent(beforeResponse.data, input.pageObjectIds), input.searchText, matchCase);

        const replaceAllTextRequest = {
            containsText: {
                text: input.searchText,
                matchCase
            },
            replaceText: input.replaceText,
            ...(input.pageObjectIds !== undefined && input.pageObjectIds.length > 0 && { pageObjectIds: input.pageObjectIds })
        };

        // https://developers.google.com/slides/api/reference/rest/v1/presentations/batchUpdate
        const updateResponse = await nango.post({
            endpoint: `${endpoint}:batchUpdate`,
            data: {
                requests: [
                    {
                        replaceAllText: replaceAllTextRequest
                    }
                ]
            },
            // replaceAllText is a non-idempotent mutation; a retry after a lost response could replace again.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const parsedReply = BatchUpdateReplySchema.parse(updateResponse.data);
        const occurrencesChanged = parsedReply.replies?.[0]?.replaceAllText?.occurrencesChanged ?? 0;

        // https://developers.google.com/slides/api/reference/rest/v1/presentations/get
        const afterResponse = await nango.get({
            endpoint,
            params: { quotaUser: 'find-and-replace-post' },
            retries: 3
        });

        const afterContent = buildSearchableContent(afterResponse.data, input.pageObjectIds);
        const postSearchTextCount = countOccurrences(afterContent, input.searchText, matchCase);
        const postReplaceTextCount = countOccurrences(afterContent, input.replaceText, matchCase);

        return {
            occurrencesChanged,
            preCount,
            postSearchTextCount,
            postReplaceTextCount
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
