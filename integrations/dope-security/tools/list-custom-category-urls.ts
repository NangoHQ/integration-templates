import { z } from 'zod';
import { createTool } from 'nango';

const InputSchema = z
    .object({
        customCategoryName: z.string().min(1).describe('Exact existing category name whose URL entries should be returned.')
    })
    .describe('Identifies the one existing custom category whose URL entries should be listed.');

const OutputSchema = z
    .object({
        items: z
            .array(z.string())
            .describe(
                "All URL-entry strings from the category's single unpaginated response; empty means no entries. Bare domains and other provider matching syntax are preserved."
            )
    })
    .describe("The category's complete, unpaginated URL entries returned as one page.");

const ProviderResponseSchema = z.object({
    data: z.object({
        urls: z.array(z.string())
    })
});

const ProviderHttpErrorSchema = z.object({
    status: z.number().optional(),
    response: z
        .object({
            status: z.number().optional(),
            data: z.unknown().optional()
        })
        .optional()
});

const ProviderErrorBodySchema = z.object({
    errors: z.array(z.object({ message: z.string() }))
});

/**
 * @tags: [read]
 * @tagReason: Performs a single provider GET that reads one custom category's URL entries without changing any provider state.
 * @pitfalls: The provider documents no not-found status for this read: an unavailable category surfaces as category_not_found only when the provider's error identifies it, otherwise it fails as bad_request.
 */
const tool = createTool({
    name: 'list-custom-category-urls',
    description: 'Retrieve all URL entries of one existing custom category in a single provider response.',
    input: InputSchema,
    output: OutputSchema,
    meta: {
        instructions:
            "Use an exact category name from `list-custom-categories`. This returns that category's URL entries, including bare domains. There is no continuation cursor. Use `list-custom-categories` to browse category names instead.",
        requiredScopes: [],
        tags: { read_only_hint: 'true', destructive_hint: 'false', idempotent_hint: 'true' }
    },
    exec: async (nango, trigger): Promise<z.infer<typeof OutputSchema>> => {
        const input = trigger.input;

        let data: unknown;
        // @allowTryCatch: documented provider statuses (400, 403, 500) must be mapped to this tool's public error codes, including distinguishing an unavailable category from a generic bad request.
        try {
            // https://4250118259-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2Fqdf21diS0j19gSMF9LeP%2Fuploads%2F6XuU5t4y5DDhEPVZ9Rrg%2FopenAPI%20v%201_13.yaml?alt=media&token=819a185e-ab25-423a-a3d2-c624ef545bc0 — GET /custom_categories/{custom_category_name}/urls
            const response = await nango.get({
                endpoint: `/custom_categories/${encodeURIComponent(input.customCategoryName)}/urls`,
                retries: 3
            });
            data = response.data;
        } catch (err) {
            const providerError = ProviderHttpErrorSchema.safeParse(err);
            const status = providerError.success ? (providerError.data.response?.status ?? providerError.data.status) : undefined;

            if (status === 400) {
                const body = providerError.success ? ProviderErrorBodySchema.safeParse(providerError.data.response?.data) : undefined;
                const isUnavailable = body?.success === true && body.data.errors.some((error) => /not found/i.test(error.message));
                if (isUnavailable) {
                    return { items: [] };
                }
                throw new Error('bad_request: The provider rejected the category URL request. Check the exact name with list-custom-categories.');
            }
            if (status === 403) {
                throw new Error('access_denied: The provider denied access to custom category URLs. Ask an administrator for access to custom categories.');
            }
            if (status === 500) {
                throw new Error('internal_error: The provider reported an internal server error. Retry the read later.');
            }
            throw err;
        }

        const parsed = ProviderResponseSchema.parse(data);
        return { items: parsed.data.urls };
    }
});

export default tool;
