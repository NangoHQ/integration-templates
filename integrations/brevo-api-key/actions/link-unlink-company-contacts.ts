import { z } from 'zod';
import { createAction } from 'nango';
import type { ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        companyId: z
            .string()
            .min(1)
            .describe(
                'ID of the company to link or unlink contacts and deals on. Company IDs are 24-character hexadecimal strings. Example: "61a5ce58c5d4795761045990"'
            ),
        linkContactIds: z.array(z.number().int()).optional().describe('Numeric contact IDs to link to the company. Example: [1, 2, 3]'),
        unlinkContactIds: z.array(z.number().int()).optional().describe('Numeric contact IDs to unlink from the company. Example: [4, 5, 6]'),
        linkDealsIds: z
            .array(z.string())
            .optional()
            .describe('Deal IDs (24-character hexadecimal strings) to link to the company. Example: ["61a5ce58c5d4795761045990"]'),
        unlinkDealsIds: z
            .array(z.string())
            .optional()
            .describe('Deal IDs (24-character hexadecimal strings) to unlink from the company. Example: ["61a5ce58c5d4795761045994"]')
    })
    .describe('Input for linking and/or unlinking contacts and deals on a Brevo company. Provide the company ID plus at least one non-empty ID array.');

const OutputSchema = z
    .object({
        success: z.boolean().describe('True when Brevo accepted the link/unlink request (HTTP 204 No Content).')
    })
    .describe('Result of the link/unlink request. The provider returns no content on success, so this only confirms the request was accepted.');

/**
 * @tags: [write]
 * @tagReason: Mutates a company's contact and deal associations through a single PATCH request and reads nothing from the provider.
 * @pitfalls: Success returns no content beyond the success flag, so fetch the company afterward to confirm the resulting associations. Linking an already-linked contact is a silent no-op, with no error and no duplicate entry.
 */
const action = createAction({
    description: 'Link or unlink contacts and/or deals to a company in a single request.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const linkContactIds = input.linkContactIds ?? [];
        const unlinkContactIds = input.unlinkContactIds ?? [];
        const linkDealsIds = input.linkDealsIds ?? [];
        const unlinkDealsIds = input.unlinkDealsIds ?? [];

        if (linkContactIds.length === 0 && unlinkContactIds.length === 0 && linkDealsIds.length === 0 && unlinkDealsIds.length === 0) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'Provide at least one of linkContactIds, unlinkContactIds, linkDealsIds, or unlinkDealsIds with at least one ID.'
            });
        }

        const config: ProxyConfiguration = {
            // https://developers.brevo.com/reference/link-and-unlink-company-with-contact-and-deal
            endpoint: `/companies/link-unlink/${encodeURIComponent(input.companyId)}`,
            data: {
                ...(linkContactIds.length > 0 && { linkContactIds }),
                ...(unlinkContactIds.length > 0 && { unlinkContactIds }),
                ...(linkDealsIds.length > 0 && { linkDealsIds }),
                ...(unlinkDealsIds.length > 0 && { unlinkDealsIds })
            },
            retries: 1 // Link/unlink is state-convergent (re-applying the same deltas is a no-op), but it is a mutation with no idempotency key, so allow only a single retry rather than the idempotent-GET ceiling.
        };

        await nango.patch(config);

        return { success: true };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
