import { z } from 'zod';
import { createTool } from 'nango';
import type { HttpResponse } from 'nango';

const InputSchema = z
    .object({
        customCategoryName: z
            .string()
            .min(1)
            .max(32)
            .regex(/^\S(?:[\s\S]*\S)?$/)
            .regex(/^[^#!@$%^*?./\\]*$/)
            .describe(
                'New category name, at most 32 characters, with no surrounding whitespace and none of # ! @ $ % ^ * ? . / or backslash. Case and Unicode are preserved.'
            )
            .meta({ allOf: [{ pattern: '^[^#!@$%\\^*?./\\\\]*$' }, { pattern: '^\\S(?:[\\s\\S]*\\S)?$' }] })
    })
    .describe('Input for creating a new custom category.');

const OutputSchema = z
    .object({
        message: z.string().describe('Provider acknowledgment of creation; not a URL-membership or policy-deployment result.'),
        customCategoryName: z.string().describe('Exact name submitted for the newly created category; echoed after provider success.')
    })
    .describe('Result of creating a new custom category.');

const CreateCategoryResponseSchema = z.object({
    message: z.string()
});

const ProviderErrorsSchema = z.object({
    errors: z
        .array(
            z.object({
                message: z.string(),
                details: z.unknown().optional()
            })
        )
        .min(1)
});

const ProxyErrorSchema = z.object({
    response: z
        .object({
            status: z.number(),
            data: z.unknown().optional()
        })
        .optional()
});

/**
 * @tags: [write]
 * @tagReason: Sends a single create request that adds a new named custom category on the provider.
 * @pitfalls: Creating a name that already exists fails instead of updating the existing category, and the provider reports duplicates and invalid names identically, so the duplicate error is distinguished only by the provider's message. The success message acknowledges creation only; it does not confirm URL membership or policy deployment.
 */
const tool = createTool({
    name: 'create-custom-category',
    description: 'Create a new named custom category.',
    input: InputSchema,
    output: OutputSchema,
    meta: {
        instructions:
            'Use this to create a category, then use `add-url-to-custom-category` or `batch-add-urls-to-custom-category` to populate it. Use `list-custom-categories` first if the name may already exist. Creation does not replace an existing category.',
        requiredScopes: [],
        tags: { read_only_hint: 'false', destructive_hint: 'false', idempotent_hint: 'false' }
    },

    exec: async (nango, trigger): Promise<z.infer<typeof OutputSchema>> => {
        const input = trigger.input;
        let response: HttpResponse;
        // @allowTryCatch: provider 400/403/500 statuses must be remapped to the tool's public error codes, which requires intercepting the thrown proxy error.
        try {
            response = await nango.post({
                // https://4250118259-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2Fqdf21diS0j19gSMF9LeP%2Fuploads%2F6XuU5t4y5DDhEPVZ9Rrg%2FopenAPI%20v%201_13.yaml?alt=media&token=819a185e-ab25-423a-a3d2-c624ef545bc0#POST /custom_categories/{custom_category_name}
                endpoint: `/custom_categories/${encodeURIComponent(input.customCategoryName)}`,
                retries: 3
            });
        } catch (err) {
            const proxyError = ProxyErrorSchema.safeParse(err);
            const status = proxyError.success ? proxyError.data.response?.status : undefined;
            const data = proxyError.success ? proxyError.data.response?.data : undefined;
            if (status === 400) {
                const providerErrors = ProviderErrorsSchema.safeParse(data);
                const detail = providerErrors.success ? providerErrors.data.errors.map((error) => error.message).join('; ') : '';
                if (/already exists/i.test(detail)) {
                    throw new Error(
                        `category_already_exists: A custom category named '${input.customCategoryName}' already exists. Use list-custom-categories to locate it and manage its URLs, or choose another name.`
                    );
                }
                throw new Error(
                    `bad_request: The provider rejected the category name '${input.customCategoryName}' despite local validation. Choose a provider-supported category name and try again.${detail ? ` Provider errors: ${detail}` : ''}`
                );
            }
            if (status === 403) {
                throw new Error(
                    'access_denied: The provider denies category creation. Ask an administrator to grant the connection category-management access.'
                );
            }
            if (status === 500) {
                throw new Error(
                    'internal_error: The provider reported an internal server error and creation may be uncertain. Check list-custom-categories before retrying creation.'
                );
            }
            throw err;
        }

        const created = CreateCategoryResponseSchema.safeParse(response.data);
        if (!created.success) {
            throw new Error(
                'write_result_unknown: The provider write response cannot be interpreted sufficiently to establish the result. Check list-custom-categories for the name before repeating the write.'
            );
        }

        return {
            message: created.data.message,
            customCategoryName: input.customCategoryName
        };
    }
});

export default tool;
