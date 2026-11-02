import { z } from 'zod';
import { createTool } from 'nango';

const InputSchema = z
    .object({
        title: z.string().max(120).describe('Case-sensitive unique tag text, 0–120 characters; whitespace is preserved.'),
        boardId: z.string().min(1).describe('Board on which to create the tag.'),
        fillColor: z
            .enum(['red', 'light_green', 'cyan', 'yellow', 'magenta', 'green', 'blue', 'gray', 'violet', 'dark_green', 'dark_blue', 'black'])
            .optional()
            .describe('Background color; defaults to red.')
    })
    .describe('Input for creating one standalone tag on a Miro board.');

const OutputSchema = z
    .object({
        id: z.string().describe('Opaque tag ID.'),
        title: z.string().describe('Stored tag text, preserving case and empty text.'),
        boardId: z.string().describe('Board containing the tag.'),
        fillColor: z.string().describe('Stored background color.')
    })
    .describe('The created Miro board tag.');

const ProviderTagSchema = z.object({
    id: z.string(),
    title: z.string(),
    fillColor: z.string(),
    type: z.string().optional(),
    links: z
        .object({
            self: z.string().optional()
        })
        .optional()
});

const ProviderErrorBodySchema = z.object({
    code: z.string().optional(),
    message: z.string().optional(),
    status: z.number().optional(),
    type: z.string().optional()
});

const HttpErrorSchema = z.object({
    status: z.number().optional(),
    response: z
        .object({
            status: z.number().optional(),
            data: z.unknown().optional()
        })
        .optional()
});

function mapProviderError(err: unknown): Error {
    const parsed = HttpErrorSchema.safeParse(err);
    const status = parsed.success ? (parsed.data.response?.status ?? parsed.data.status) : undefined;
    const body = parsed.success ? ProviderErrorBodySchema.safeParse(parsed.data.response?.data) : undefined;
    const providerMessage = body?.success && body.data.message ? ` Miro said: ${body.data.message}` : '';

    switch (status) {
        case 400:
            if (body?.success && body.data.message && /unique|already|duplicate|taken|exists/i.test(body.data.message)) {
                return new Error(
                    `duplicate_tag_title: The board already has a tag with the same case-sensitive title. Use list-tags to find the tag, or choose a different title.${providerMessage}`
                );
            }
            return new Error(`invalid_request: Miro rejected the tag properties. Correct the rejected title or color.${providerMessage}`);
        case 401:
        case 403:
            return new Error(
                `permission_denied: Board editing access or boards:write is missing. Ask for editing access and the required scope.${providerMessage}`
            );
        case 404:
            return new Error(`not_found: The board is unavailable. Check board ID and access.${providerMessage}`);
        case 429:
            return new Error(
                `rate_limited: Miro returned too many requests. Wait before retrying; check list-tags if creation was ambiguous.${providerMessage}`
            );
        default:
            return err instanceof Error ? err : new Error('Miro tag creation failed with an unexpected error.');
    }
}

/**
 * @tags: [write]
 * @tagReason: Creates a new tag on a Miro board, which is a provider-side mutation.
 * @pitfalls: Tag titles are case-sensitive and must be unique per board, so Miro rejects duplicates; empty titles are accepted.
 */
const tool = createTool({
    name: 'create-tag',
    description: 'Create a board tag with a case-sensitive unique title and a background color.',
    input: InputSchema,
    output: OutputSchema,
    meta: {
        instructions:
            'Use this to create a tag, then `add-tag-to-item` to apply it. Check `list-tags` first if the tag may already exist. Titles are case-sensitive and unique on the board; empty titles are permitted by the documented schema.',
        requiredScopes: ['boards:write'],
        tags: { read_only_hint: 'false', destructive_hint: 'false', idempotent_hint: 'false' }
    },
    exec: async (nango, trigger): Promise<z.infer<typeof OutputSchema>> => {
        const input = trigger.input;
        const fillColor = input.fillColor ?? 'red';

        let responseData: unknown;
        // @allowTryCatch: Miro documents only generic 400/404/429 error bodies, so the HTTP status and message must be inspected to map failures to the tool's public error codes.
        try {
            // https://developers.miro.com/reference/create-tag
            const response = await nango.post({
                endpoint: `/v2/boards/${encodeURIComponent(input.boardId)}/tags`,
                params: {
                    title: input.title,
                    fillColor
                },
                // Non-idempotent create: a retry after a lost response could create a duplicate tag, so do not retry automatically.
                retries: 0
            });
            responseData = response.data;
        } catch (err) {
            throw mapProviderError(err);
        }

        const tag = ProviderTagSchema.safeParse(responseData);
        if (!tag.success) {
            throw new Error(
                'write_result_unknown: Creation may have happened but the response cannot be mapped. Check list-tags by exact title before retrying.'
            );
        }

        return {
            id: tag.data.id,
            title: tag.data.title,
            boardId: input.boardId,
            fillColor: tag.data.fillColor
        };
    }
});

export default tool;
