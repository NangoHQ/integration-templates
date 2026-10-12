import { z } from 'zod';
import { createAction } from 'nango';

import { resolveOrganizationId } from '../helpers/organization.js';

const InputSchema = z
    .object({
        creditnote_id: z.string().describe('ID of the credit note to delete. Example: "260815000000163079"'),
        organization_id: z
            .string()
            .optional()
            .describe(
                'Zoho Inventory organization ID. If omitted and only one organization exists, it is used automatically. Required when multiple organizations exist.'
            )
    })
    .describe('Identifies the credit note to delete and the organization it belongs to.');

const DeleteCreditNoteResponseSchema = z.object({
    code: z.number(),
    message: z.string()
});

const OutputSchema = z
    .object({
        success: z.boolean().describe('True when Zoho Inventory confirmed the credit note was deleted.'),
        message: z.string().describe('Confirmation message returned by Zoho Inventory.')
    })
    .describe('Result of the credit note deletion.');

/**
 * @tags: [write, destructive]
 * @tagReason: Deletes an existing credit note, permanently removing it from the organization.
 * @pitfalls: Deletion is permanently blocked once the credit note has been applied to an invoice or refunded; such an attempt surfaces the provider's error instead of a success:false result, and the block cannot be reversed through this API.
 */
const action = createAction({
    description: 'Delete a credit note that has not been applied to an invoice or refunded.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInventory.creditnotes.DELETE', 'ZohoInventory.settings.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const organizationId = await resolveOrganizationId(nango, input.organization_id);

        const response = await nango.delete({
            // https://www.zoho.com/inventory/api/v1/credit-notes/
            endpoint: `/inventory/v1/creditnotes/${encodeURIComponent(input.creditnote_id)}`,
            params: {
                organization_id: organizationId
            },
            // A retry after a lost response would report "does not exist" even though the delete already succeeded.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        const providerResponse = DeleteCreditNoteResponseSchema.parse(response.data);
        if (providerResponse.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: providerResponse.message,
                code: providerResponse.code
            });
        }

        return {
            success: true,
            message: providerResponse.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
