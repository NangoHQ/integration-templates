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
        occurrencesChanged: z
            .number()
            .describe('Authoritative number of occurrences the provider reported replacing; 0 when the provider reply omits the field.'),
        preCount: z.number().describe('Occurrences of searchText counted in slide and speaker notes text (within the requested pages) before the update.'),
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

const TextSchema = z.object({
    textElements: z
        .array(
            z.object({
                textRun: z
                    .object({
                        content: z.string().optional()
                    })
                    .optional()
            })
        )
        .optional()
});

interface PageElement {
    shape?: { text?: z.infer<typeof TextSchema> | undefined } | undefined;
    table?: { tableRows?: { tableCells?: { text?: z.infer<typeof TextSchema> | undefined }[] | undefined }[] | undefined } | undefined;
    elementGroup?: { children?: PageElement[] | undefined } | undefined;
}

const PageElementSchema: z.ZodType<PageElement> = z.lazy(() =>
    z.object({
        shape: z
            .object({
                text: TextSchema.optional()
            })
            .optional(),
        table: z
            .object({
                tableRows: z
                    .array(
                        z.object({
                            tableCells: z
                                .array(
                                    z.object({
                                        text: TextSchema.optional()
                                    })
                                )
                                .optional()
                        })
                    )
                    .optional()
            })
            .optional(),
        elementGroup: z
            .object({
                children: z.array(PageElementSchema).optional()
            })
            .optional()
    })
);

const PageSchema = z.object({
    objectId: z.string().optional(),
    pageElements: z.array(PageElementSchema).optional()
});

const PresentationSchema = z.object({
    revisionId: z.string().optional(),
    slides: z
        .array(
            PageSchema.extend({
                slideProperties: z
                    .object({
                        notesPage: PageSchema.optional()
                    })
                    .optional()
            })
        )
        .optional()
});

type Presentation = z.infer<typeof PresentationSchema>;

// Full pageElements are requested so text inside groups at any depth is included.
const TEXT_FIELDS = 'slides(objectId,pageElements,slideProperties.notesPage(objectId,pageElements))';

function joinText(text: z.infer<typeof TextSchema> | undefined): string {
    return (text?.textElements ?? []).map((element) => element.textRun?.content ?? '').join('');
}

function collectElementTexts(elements: PageElement[] | undefined, out: string[]): void {
    for (const element of elements ?? []) {
        if (element.shape?.text) {
            out.push(joinText(element.shape.text));
        }
        for (const row of element.table?.tableRows ?? []) {
            for (const cell of row.tableCells ?? []) {
                if (cell.text) {
                    out.push(joinText(cell.text));
                }
            }
        }
        collectElementTexts(element.elementGroup?.children, out);
    }
}

/**
 * Collects one string per text body (shape or table cell) on the pages replaceAllText affects.
 * Text runs are concatenated per body so matches split across differently styled runs are counted.
 * Unscoped, replaceAllText affects every slide and its speaker notes page; scoped, it only affects
 * the listed page IDs (a slide ID does not include that slide's notes page).
 */
function collectTextBodies(presentation: Presentation, pageObjectIds: string[] | undefined): string[] {
    const scoped = pageObjectIds !== undefined && pageObjectIds.length > 0 ? new Set(pageObjectIds) : undefined;
    const bodies: string[] = [];
    for (const slide of presentation.slides ?? []) {
        if (scoped === undefined || (slide.objectId !== undefined && scoped.has(slide.objectId))) {
            collectElementTexts(slide.pageElements, bodies);
        }
        const notesPage = slide.slideProperties?.notesPage;
        if (notesPage && (scoped === undefined || (notesPage.objectId !== undefined && scoped.has(notesPage.objectId)))) {
            collectElementTexts(notesPage.pageElements, bodies);
        }
    }
    return bodies;
}

function countOccurrences(bodies: string[], needle: string, matchCase: boolean): number {
    if (needle.length === 0) {
        return 0;
    }
    const target = matchCase ? needle : needle.toLowerCase();
    let count = 0;
    for (const body of bodies) {
        const searchable = matchCase ? body : body.toLowerCase();
        let index = searchable.indexOf(target);
        while (index !== -1) {
            count += 1;
            index = searchable.indexOf(target, index + target.length);
        }
    }
    return count;
}

/**
 * @tags: [read, write]
 * @tagReason: Reads the presentation before and after the update, and mutates it by replacing matching text.
 * @pitfalls: The replacement is permanent (the Slides API offers no undo). occurrencesChanged is the provider's authoritative count; the before/after counts are computed locally from shape and table-cell text on slides and speaker notes (including grouped shapes) and use simple case folding, so they can differ slightly from the provider for exotic Unicode. A pageObjectIds-scoped replacement leaves matching text on other pages (a slide ID does not include its notes page), so postSearchTextCount can stay above 0 even when occurrencesChanged is non-zero. The update is pinned to the revision read before it, so a concurrent edit in between makes the call fail rather than report inconsistent counts.
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

        // https://developers.google.com/slides/api/reference/rest/v1/presentations/get
        const beforeResponse = await nango.get({
            endpoint,
            // revisionId is read so the update below can be pinned to exactly the content that was counted.
            params: { fields: `revisionId,${TEXT_FIELDS}` },
            retries: 3
        });

        const before = PresentationSchema.parse(beforeResponse.data);
        const preCount = countOccurrences(collectTextBodies(before, input.pageObjectIds), input.searchText, matchCase);

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
                ],
                ...(before.revisionId !== undefined && { writeControl: { requiredRevisionId: before.revisionId } })
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
            params: { fields: TEXT_FIELDS },
            retries: 3
        });

        const afterBodies = collectTextBodies(PresentationSchema.parse(afterResponse.data), input.pageObjectIds);
        const postSearchTextCount = countOccurrences(afterBodies, input.searchText, matchCase);
        const postReplaceTextCount = countOccurrences(afterBodies, input.replaceText, matchCase);

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
