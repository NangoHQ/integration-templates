import { z } from 'zod';
import { createTool } from 'nango';

const InputSchema = z
    .object({
        blockId: z.string().min(1).describe('Block identifier to move to trash.')
    })
    .describe('Input for moving one Notion block to the trash.');

const OutputSchema = z
    .object({
        id: z.string().describe('Affected block identifier.'),
        inTrash: z.boolean().optional().describe('Provider-reported trash state; absent on an identity-only response.')
    })
    .describe('Result of moving a Notion block to the trash.');

const DeleteBlockResponseSchema = z.object({
    id: z.string(),
    in_trash: z.boolean().nullish()
});

const ProxyErrorSchema = z.object({
    response: z
        .object({
            status: z.number().optional(),
            data: z.unknown().optional()
        })
        .optional()
});

const NotionErrorBodySchema = z.object({
    code: z.string().optional(),
    message: z.string().optional()
});

function toPublicError(error: unknown): Error {
    const parsedError = ProxyErrorSchema.safeParse(error);
    const response = parsedError.success ? parsedError.data.response : undefined;
    const status = response?.status;
    const parsedBody = NotionErrorBodySchema.safeParse(response?.data);
    const code = parsedBody.success ? parsedBody.data.code : undefined;
    const detail = parsedBody.success && parsedBody.data.message ? ` Notion: ${parsedBody.data.message}` : '';

    switch (status) {
        case 400:
            return new Error(`invalid_request: Notion rejected the target. Check the block ID.${detail}`);
        case 401:
            return new Error(`permission_denied: The connection cannot remove the block. Share the page and grant update-content capability.${detail}`);
        case 403:
            if (code === 'workspace_credits_exhausted' || code === 'agent_credit_limit_reached') {
                return new Error(`resource_limit: Notion reports a resource limit. Review the provider explanation.${detail}`);
            }
            return new Error(`permission_denied: The connection cannot remove the block. Share the page and grant update-content capability.${detail}`);
        case 404:
            return new Error(`not_found: The block is unavailable. Check get-block and page access.${detail}`);
        case 406:
            return new Error(`resource_limit: Notion reports a resource limit. Review the provider explanation.${detail}`);
        case 409:
            return new Error(`conflict: Block lifecycle or concurrency prevents removal. Inspect get-block before retrying.${detail}`);
        case 429:
            return new Error(`rate_limited: Notion throttles removal. Wait, then inspect get-block before retrying.${detail}`);
        case 500:
        case 502:
        case 503:
        case 504:
        case 529:
            return new Error(
                `provider_unavailable: Notion reported an internal, unavailable, overload, or gateway failure. Inspect get-block before replaying.${detail}`
            );
        default:
            return new Error(`write_result_unknown: The removal outcome could not be mapped. Inspect get-block or Notion trash before retrying.${detail}`);
    }
}

/**
 * @tags: [write, destructive]
 * @tagReason: Moves a Notion block to the provider trash, a mutation that removes the block from usable content and is only reversible through a separate restore request.
 * @pitfalls: Deleting a block that is a page trashes the entire page. Notion may report failure even after the trash change was saved, so inspect the block before retrying after provider_unavailable. A not_found error can also mean the block was never shared with the connection.
 */
const tool = createTool({
    name: 'delete-block',
    description: 'Move a block to trash without claiming permanent erasure.',
    input: InputSchema,
    output: OutputSchema,
    meta: {
        instructions:
            'Use an ID from `list-block-children` or `get-block`. This removes the block from usable content; use `restore-block` to request recovery. Do not use this to merely clear text.',
        requiredScopes: [],
        tags: { read_only_hint: 'false', destructive_hint: 'true', idempotent_hint: 'false' }
    },
    exec: async (nango, trigger): Promise<z.infer<typeof OutputSchema>> => {
        const input = trigger.input;

        let data: unknown;
        // @allowTryCatch: provider HTTP errors must be translated into the public error codes this tool contract defines.
        try {
            // https://developers.notion.com/reference/delete-a-block
            const response = await nango.delete<unknown>({
                endpoint: `/v1/blocks/${encodeURIComponent(input.blockId)}`,
                headers: {
                    'Notion-Version': '2026-03-11'
                },
                // Not naturally idempotent: a retry after a lost response would repeat the trash mutation, so no automatic retries.
                retries: 0
            });
            data = response.data;
        } catch (error) {
            const parsedError = ProxyErrorSchema.safeParse(error);
            if (parsedError.success && parsedError.data.response?.status === 409) {
                return { id: input.blockId };
            }
            throw toPublicError(error);
        }

        const parsed = DeleteBlockResponseSchema.safeParse(data);
        if (!parsed.success) {
            throw new Error('write_result_unknown: The removal response cannot be mapped. Inspect get-block or Notion trash before retrying.');
        }

        return {
            id: parsed.data.id,
            ...(parsed.data.in_trash != null && { inTrash: parsed.data.in_trash })
        };
    }
});

export default tool;
