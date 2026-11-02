import { z } from 'zod';
import { createTool } from 'nango';

const InputSchema = z
    .object({
        userId: z
            .string()
            .regex(/^[0-9]+$/)
            .describe('User to add as a follower.'),
        productId: z
            .string()
            .regex(/^[0-9]+$/)
            .describe('Product to follow.')
    })
    .describe('Input for adding a user as a follower of a product.');

const OutputSchema = z
    .object({
        userId: z.string().describe('User confirmed as the follower.'),
        addedAt: z.iso.datetime({ offset: true }).optional().describe('Following association creation instant in UTC, if returned.'),
        productId: z.string().describe('Product followed.')
    })
    .describe('Result of adding a user as a follower of a product.');

const ProviderAddFollowerResponseSchema = z.object({
    success: z.boolean().optional(),
    data: z
        .object({
            user_id: z.number().optional().nullable(),
            add_time: z.string().optional().nullable()
        })
        .optional()
        .nullable()
});

const ProviderErrorSchema = z.object({
    response: z
        .object({
            status: z.number().optional(),
            data: z
                .object({
                    error: z.string().optional().nullable(),
                    error_info: z.string().optional().nullable()
                })
                .optional()
                .nullable()
        })
        .optional()
        .nullable()
});

function toUtcRfc3339(raw: string): string | undefined {
    const trimmed = raw.trim();
    // Zone-less Pipedrive timestamps (e.g. '2025-01-02 03:04:05') are treated as UTC.
    const zoneLess = /^(?<date>\d{4}-\d{2}-\d{2})[T ](?<time>\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?)$/.exec(trimmed);
    if (zoneLess?.groups) {
        const candidate = `${zoneLess.groups['date']}T${zoneLess.groups['time']}Z`;
        return Number.isNaN(Date.parse(candidate)) ? undefined : candidate;
    }
    const zoned = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?<fraction>\.\d{1,3})?(?<zone>Z|[+-]\d{2}:\d{2})$/.exec(trimmed);
    if (!zoned?.groups) {
        return undefined;
    }
    const epochMs = Date.parse(trimmed);
    if (Number.isNaN(epochMs)) {
        return undefined;
    }
    if (zoned.groups['zone'] === 'Z') {
        // Already UTC RFC 3339; keep the value verbatim to preserve its precision.
        return trimmed;
    }
    const iso = new Date(epochMs).toISOString();
    const fraction = zoned.groups['fraction'];
    if (!fraction) {
        return iso.replace(/\.000Z$/, 'Z');
    }
    const digits = fraction.slice(1).padEnd(3, '0');
    return iso.replace(/\.\d{3}Z$/, `.${digits}Z`);
}

function mapProviderError(error: unknown): Error {
    const parsed = ProviderErrorSchema.safeParse(error);
    const providerResponse = parsed.success ? parsed.data.response : undefined;
    const status = providerResponse?.status;
    const providerMessage = providerResponse?.data?.error ?? providerResponse?.data?.error_info ?? undefined;
    const withDetail = (message: string): string => (providerMessage ? `${message} Provider error: ${providerMessage}` : message);

    if (status === 404) {
        return new Error(withDetail('not_found: Product or user is unavailable. Check the product and the user ID.'));
    }
    if (status === 403) {
        return new Error(withDetail('permission_denied: Product write scope or follower-management permission is missing. Ask an administrator for access.'));
    }
    if ((status === 400 || status === 409) && providerMessage !== undefined && /already/i.test(providerMessage)) {
        return new Error(
            withDetail('already_associated: The user already follows this product. Use list-product-followers to verify; no further add is needed.')
        );
    }
    if (status === 400 && providerMessage !== undefined && /not found/i.test(providerMessage)) {
        return new Error(withDetail('not_found: Product or user is unavailable. Check the product and the user ID.'));
    }
    return error instanceof Error ? error : new Error(String(error));
}

/**
 * @tags: [write]
 * @tagReason: Creates a new product-follower association through a provider POST; it reads nothing and deletes nothing.
 * @pitfalls: Adding a user who already follows the product fails with an already_associated error instead of a no-op success, so repeating the call to ensure the association errors once it exists.
 */
const tool = createTool({
    name: 'add-follower-to-product',
    description: 'Add a user as a follower of a product.',
    input: InputSchema,
    output: OutputSchema,
    meta: {
        instructions:
            'Use productId from `list-products` and a known Pipedrive user ID, for example from `list-product-permitted-users`. Inspect current followers using `list-product-followers`. This changes a product/user association, not notification delivery infrastructure. Use `remove-follower-from-product` to undo the association.',
        requiredScopes: ['products:full'],
        tags: { read_only_hint: 'false', destructive_hint: 'false', idempotent_hint: 'false' }
    },
    exec: async (nango, trigger): Promise<z.infer<typeof OutputSchema>> => {
        const input = trigger.input;
        const productIdNum = Number(input.productId);
        const userIdNum = Number(input.userId);

        let responseData: unknown;
        // @allowTryCatch: map Pipedrive error responses (404/403/duplicate 400) to the tool's stable public error codes.
        try {
            // https://developers.pipedrive.com/docs/api/v1/openapi-v2.yaml#POST%20/products/{id}/followers
            const response = await nango.post({
                endpoint: `/v2/products/${encodeURIComponent(input.productId)}/followers`,
                data: {
                    user_id: userIdNum
                },
                // Not idempotent: Pipedrive offers no idempotency key, so a retry after a lost response would repeat the association write (a duplicate is rejected with 400).
                retries: 0
            });
            responseData = response.data;
        } catch (error) {
            throw mapProviderError(error);
        }

        const parsed = ProviderAddFollowerResponseSchema.safeParse(responseData);
        if (!parsed.success || parsed.data.success === false || parsed.data.data == null || parsed.data.data.user_id == null) {
            throw new Error(
                'write_result_unknown: The provider response could not be interpreted after the follower association may have been added. Check list-product-followers before trying again.'
            );
        }
        const follower = parsed.data.data;

        let addedAt: string | undefined;
        if (follower.add_time !== undefined && follower.add_time !== null) {
            const parsedAddTime = toUtcRfc3339(follower.add_time);
            if (parsedAddTime === undefined) {
                throw new Error(
                    'write_result_unknown: The provider returned an add_time that could not be parsed after the follower association may have been added. Check list-product-followers before trying again.'
                );
            }
            addedAt = parsedAddTime;
        }

        return {
            userId: String(follower.user_id),
            ...(addedAt !== undefined && { addedAt }),
            productId: String(productIdNum)
        };
    }
});

export default tool;
