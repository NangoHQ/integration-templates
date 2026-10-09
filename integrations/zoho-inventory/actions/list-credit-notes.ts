import { z } from 'zod';
import { createAction } from 'nango';

import { resolveOrganizationId } from '../helpers/organization.js';

const InputSchema = z
    .object({
        organization_id: z
            .string()
            .optional()
            .describe(
                'Zoho Inventory organization ID. If omitted and only one organization exists, it is used automatically. Required when multiple organizations exist.'
            ),
        cursor: z
            .string()
            .regex(/^[1-9]\d*$/)
            .optional()
            .describe('Pagination cursor (page number) from the previous response. Omit for the first page.'),
        per_page: z.number().int().min(1).max(200).optional().describe('Number of credit notes to return per page. Default: 200. Max: 200.')
    })
    .describe('Filters for listing credit notes issued to customers.');

const CreditNoteSchema = z
    .object({
        creditnote_id: z.string().describe('Unique identifier of the credit note.'),
        creditnote_number: z.string().optional().describe('Credit note number. Example: "CN-00001".'),
        status: z.string().optional().describe('Credit note status. Example: "open", "closed", "void", "draft".'),
        reference_number: z.string().optional().describe('Reference number supplied by the customer.'),
        date: z.string().optional().describe('Credit note date in yyyy-mm-dd format.'),
        total: z.number().optional().describe('Total amount of the credit note.'),
        balance: z.number().optional().describe('Outstanding balance of the credit note.'),
        customer_id: z.string().optional().describe('ID of the customer the credit note was issued to.'),
        customer_name: z.string().optional().describe('Name of the customer the credit note was issued to.'),
        currency_id: z.string().optional().describe('Currency ID.'),
        currency_code: z.string().optional().describe('Currency code. Example: "USD".'),
        created_time: z.string().optional().describe('Time the credit note was created.'),
        last_modified_time: z.string().optional().describe('Time the credit note was last modified.'),
        is_emailed: z.boolean().optional().describe('Whether the credit note has been emailed to the customer.')
    })
    .passthrough();

const PageContextSchema = z.object({
    page: z.number().int().optional(),
    per_page: z.number().int().optional(),
    has_more_page: z.boolean().optional()
});

const ProviderResponseSchema = z.object({
    code: z.number().int(),
    message: z.string().optional(),
    creditnotes: z.array(CreditNoteSchema).optional(),
    page_context: PageContextSchema.optional()
});

const OutputSchema = z
    .object({
        items: z.array(CreditNoteSchema).describe('Credit notes issued to customers.'),
        next_cursor: z.string().optional().describe('Cursor (page number) to fetch the next page. Absent when there are no more pages.')
    })
    .describe('A single page of credit notes.');

/**
 * @tags: [read]
 * @tagReason: Lists credit notes from the provider without modifying any data.
 * @pitfalls: Credit notes are created directly in "open" status rather than "draft", so results will never contain a draft-stage record even though the status field documents "draft" as a possible value.
 */
const action = createAction({
    description: 'List credit notes issued to customers in Zoho Inventory.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInventory.creditnotes.READ', 'ZohoInventory.settings.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const organizationId = await resolveOrganizationId(nango, input.organization_id);

        const page = input.cursor ? parseInt(input.cursor, 10) : 1;

        const response = await nango.get({
            // https://www.zoho.com/inventory/api/v1/credit-notes/#list-credit-notes
            endpoint: '/inventory/v1/creditnotes',
            params: {
                organization_id: organizationId,
                page: String(page),
                ...(input.per_page !== undefined && { per_page: String(input.per_page) })
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (providerResponse.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: providerResponse.message ?? 'Unknown error from Zoho Inventory',
                code: providerResponse.code
            });
        }

        // Zoho always includes "creditnotes" (as [] when empty); a missing list must not be reported as an empty page.
        const creditnotes = providerResponse.creditnotes;
        if (!creditnotes) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Zoho Inventory response is missing the "creditnotes" list.'
            });
        }
        const hasMorePage = providerResponse.page_context?.has_more_page ?? false;
        const nextCursor = hasMorePage ? String(page + 1) : undefined;

        return {
            items: creditnotes,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
