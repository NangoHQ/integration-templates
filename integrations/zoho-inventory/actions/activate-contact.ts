import { z } from 'zod';
import { createAction } from 'nango';

import { resolveOrganizationId } from '../helpers/organization.js';

const InputSchema = z
    .object({
        contact_id: z.string().describe('ID of the inactive contact to mark as active. Example: "460000000026049"'),
        organization_id: z
            .string()
            .optional()
            .describe(
                'Zoho Inventory organization ID. If omitted and only one organization exists, it is used automatically. Required when multiple organizations exist.'
            )
    })
    .describe('Input for marking a Zoho Inventory contact as active.');

const ActivateContactResponseSchema = z.object({
    code: z.number(),
    message: z.string()
});

const OutputSchema = z
    .object({
        contact_id: z.string().describe('ID of the contact that was marked as active.'),
        message: z.string().describe('Confirmation message returned by Zoho Inventory.')
    })
    .describe('Result of marking a Zoho Inventory contact as active.');

/**
 * @tags: [write]
 * @tagReason: Marks the given contact as active on the provider, changing its status.
 * @pitfalls: The provider returns success even when the contact is already active, so a 200 does not confirm that the status actually changed; the endpoint requires the contacts CREATE scope rather than an update scope.
 */
const action = createAction({
    description: 'Mark an inactive contact as active again.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInventory.contacts.CREATE', 'ZohoInventory.settings.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const organizationId = await resolveOrganizationId(nango, input.organization_id);

        const response = await nango.post({
            // https://www.zoho.com/inventory/api/v1/contacts/#mark-as-active
            endpoint: `/inventory/v1/contacts/${encodeURIComponent(input.contact_id)}/active`,
            params: {
                organization_id: organizationId
            },
            retries: 3
        });

        const parsed = ActivateContactResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response from Zoho Inventory API when marking contact as active.',
                details: parsed.error.message
            });
        }

        const result = parsed.data;

        if (result.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: result.message,
                code: result.code
            });
        }

        return {
            contact_id: input.contact_id,
            message: result.message
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
