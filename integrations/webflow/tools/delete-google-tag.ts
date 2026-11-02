import { z } from 'zod';
import { createTool } from 'nango';

const InputSchema = z
    .object({
        tagId: z.string().min(1).describe('Configured Google tag identifier, as returned by list-google-tags.'),
        siteId: z.string().min(1).describe('Site from which to delete the tag configuration.')
    })
    .describe('Input for deleting one configured Google tag from a site.');

const OutputSchema = z
    .object({
        items: z
            .array(
                z.object({
                    id: z.string().describe('Remaining Google tag identifier.'),
                    order: z.number().int().describe('Renormalized provider display-order value.'),
                    displayName: z.string().describe('Remaining tag label.')
                })
            )
            .describe('Remaining configured tags after deletion, in provider display order.')
    })
    .describe('Remaining Google tag configuration after the deletion.');

const ProviderGoogleTagSchema = z.object({
    tagId: z.string(),
    displayName: z.string(),
    order: z.number().int().optional()
});

const ProviderDeleteResponseSchema = z.object({
    googleTagIds: z.array(ProviderGoogleTagSchema)
});

const ErrorStatusSchema = z.object({
    response: z.object({
        status: z.number()
    })
});

/**
 * @tags: [write, destructive]
 * @tagReason: Deletes a site's configured Google tag entry, a provider mutation that removes configuration and is difficult to reverse exactly.
 * @pitfalls: Webflow renormalizes the remaining tags' order values after deletion, so returned orders can differ from before the call. Configuring the same tag again later is a new upsert that does not restore its original order.
 */
const tool = createTool({
    name: 'delete-google-tag',
    description: "Delete a single site's Google tag configuration and return its remaining tags. This does not delete the tag in Google.",
    input: InputSchema,
    output: OutputSchema,
    meta: {
        instructions:
            "Obtain tagId from `list-google-tags`. This removes only that site's configuration entry and renormalizes remaining display orders. Use `delete-all-google-tags` only to clear the entire site configuration. A tag can be configured again with `upsert-google-tag`; the original order is not guaranteed.",
        requiredScopes: ['sites:write'],
        tags: { read_only_hint: 'false', destructive_hint: 'true', idempotent_hint: 'false' }
    },
    exec: async (nango, trigger): Promise<z.infer<typeof OutputSchema>> => {
        const input = trigger.input;

        let responseData: unknown;
        // @allowTryCatch: map provider HTTP status codes to the tool's documented public error codes.
        try {
            // https://developers.webflow.com/api-reference/rest/sites/integrations/google-tags/delete-google-tag
            const response = await nango.delete({
                endpoint: `/sites/${encodeURIComponent(input.siteId)}/integrations/google_tags/${encodeURIComponent(input.tagId)}`,
                // No idempotency key: retrying a delete after a lost response would repeat the mutation against renormalized state, so the call must not auto-retry.
                retries: 0
            });
            responseData = response.data;
        } catch (error) {
            const parsed = ErrorStatusSchema.safeParse(error);
            const status = parsed.success ? parsed.data.response.status : undefined;
            if (status === 400) {
                throw new Error('invalid_request: Webflow rejected a target identifier. Use the exact ID from list-google-tags.');
            }
            if (status === 401 || status === 403) {
                throw new Error('access_denied: The connection lacks sites:write or site access. Ask an administrator for write access.');
            }
            if (status === 404) {
                throw new Error(
                    'not_found: The site or configured tag is unavailable. Inspect list-google-tags; no additional removal is needed if the intended tag is absent.'
                );
            }
            if (status === 429) {
                throw new Error('rate_limited: The token rate limit was reached. Wait and inspect current tags before repeating an uncertain removal.');
            }
            if (status !== undefined && status >= 500) {
                throw new Error('provider_error: Webflow reported a server error. Check current configuration before retrying later.');
            }
            throw error;
        }

        const parsedResponse = ProviderDeleteResponseSchema.safeParse(responseData);
        if (!parsedResponse.success) {
            throw new Error('write_result_unknown: The deletion result cannot be interpreted. Check list-google-tags before retrying.');
        }

        const items: { id: string; order: number; displayName: string }[] = [];
        for (const tag of parsedResponse.data.googleTagIds) {
            if (tag.order === undefined) {
                throw new Error('write_result_unknown: The deletion result cannot be interpreted. Check list-google-tags before retrying.');
            }
            items.push({ id: tag.tagId, order: tag.order, displayName: tag.displayName });
        }

        return { items };
    }
});

export default tool;
