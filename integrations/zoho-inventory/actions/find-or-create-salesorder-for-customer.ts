import { z } from 'zod';
import { createAction } from 'nango';

const OrganizationsResponseSchema = z.object({
    code: z.number(),
    organizations: z
        .array(z.object({ organization_id: z.union([z.string(), z.number()]) }))
        .nullable()
        .optional()
});

const ZohoIdSchema = z.union([z.string(), z.number()]).transform((value) => String(value));

const ContactSchema = z.object({
    contact_id: ZohoIdSchema,
    contact_name: z.string()
});

const ContactsResponseSchema = z.object({
    code: z.number(),
    message: z.string().optional(),
    contacts: z.array(ContactSchema).nullable().optional()
});

const CreatedContactResponseSchema = z.object({
    code: z.number(),
    message: z.string().optional(),
    contact: z
        .object({
            contact_id: ZohoIdSchema,
            contact_name: z.string().nullable().optional()
        })
        .nullable()
        .optional()
});

const SalesOrderResponseSchema = z.object({
    code: z.number(),
    message: z.string().optional(),
    salesorder: z
        .object({
            salesorder_id: ZohoIdSchema,
            salesorder_number: z.string().nullable().optional(),
            customer_id: ZohoIdSchema.nullable().optional(),
            customer_name: z.string().nullable().optional(),
            status: z.string().nullable().optional(),
            order_status: z.string().nullable().optional(),
            date: z.string().nullable().optional(),
            total: z.number().nullable().optional(),
            created_time: z.string().nullable().optional()
        })
        .nullable()
        .optional()
});

const LineItemInputSchema = z.object({
    item_id: z.string().describe('Item ID to add to the sales order. Example: "260815000000101002"'),
    quantity: z.number().describe('Quantity of the item. Example: 1'),
    rate: z.number().optional().describe('Price per unit. Omit to use the item default rate. Example: 150'),
    description: z.string().optional().describe('Description shown for the line item.'),
    tax_id: z.string().optional().describe('Tax ID to apply to the line item.')
});

const InputSchema = z
    .object({
        customer_name: z
            .string()
            .min(1)
            .describe('Exact name of the customer contact to bill. Matched verbatim; a new contact is created when no contact already has this exact name.'),
        line_items: z.array(LineItemInputSchema).min(1).describe('Line items for the sales order. At least one is required.'),
        organization_id: z
            .string()
            .optional()
            .describe(
                'Zoho Inventory organization ID. If omitted and only one organization exists, it is used automatically. Required when multiple organizations exist. Example: "927270289"'
            ),
        salesorder_number: z.string().optional().describe('Sales order number. Omit to let Zoho auto-generate one. Example: "SO-00017"'),
        date: z.string().optional().describe('Sales order date. Format: yyyy-mm-dd. Example: "2026-10-09"'),
        reference_number: z.string().optional().describe('Reference number stored on the sales order.'),
        notes: z.string().optional().describe('Notes shown at the bottom of the sales order.'),
        terms: z.string().optional().describe('Terms and conditions shown on the sales order.')
    })
    .describe('Input for creating a sales order for a customer, creating the contact first when no contact with the exact name exists.');

const OutputSchema = z
    .object({
        customer_id: z.string().describe('ID of the contact used for the sales order.'),
        customer_name: z.string().describe('Exact name of the contact used for the sales order.'),
        contact_created: z
            .boolean()
            .describe('True when no contact with the exact name existed and this action created one; false when an existing contact was reused.'),
        salesorder_id: z.string().describe('Unique ID of the created sales order.'),
        salesorder_number: z.string().optional().describe('Sales order number assigned by Zoho. Example: "SO-00017"'),
        status: z.string().optional().describe('Fulfillment rollup status of the sales order. Example: "draft"'),
        order_status: z.string().optional().describe('Workflow status of the sales order, which can differ from status. Example: "draft"'),
        date: z.string().optional().describe('Sales order date. Format: yyyy-mm-dd.'),
        total: z.number().optional().describe('Total amount of the sales order.'),
        created_time: z.string().optional().describe('Creation timestamp in Zoho format (numeric offset, no colon). Example: "2026-10-09T14:27:29-0400"')
    })
    .describe('The created sales order and the contact it was billed to, including whether a new contact was created.');

/**
 * @tags: [read, write]
 * @tagReason: Reads existing contacts by exact name, then creates a contact when missing and creates a sales order against it.
 * @pitfalls: The customer name must match an existing contact exactly, otherwise a brand-new contact is created and can duplicate one that already exists; the action never dedupes sales orders, so every call creates another one, and the returned status/order_status both start as draft.
 */
const action = createAction({
    description: 'Create a sales order for a customer identified by exact name, creating the contact first if it does not exist.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['ZohoInventory.contacts.READ', 'ZohoInventory.contacts.CREATE', 'ZohoInventory.salesorders.CREATE', 'ZohoInventory.settings.READ'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let organizationId: string | undefined = input.organization_id;
        if (!organizationId) {
            const orgResponse = await nango.get({
                // https://www.zoho.com/inventory/api/v1/organizations/#list-organizations
                endpoint: '/inventory/v1/organizations',
                retries: 3
            });
            const orgData = OrganizationsResponseSchema.parse(orgResponse.data);
            if (orgData.code !== 0) {
                throw new nango.ActionError({
                    type: 'provider_error',
                    message: 'Failed to retrieve organizations from Zoho Inventory.'
                });
            }
            if (!orgData.organizations || orgData.organizations.length === 0) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: 'No organizations found for this Zoho Inventory account.'
                });
            }
            if (orgData.organizations.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_organizations',
                    message: `Multiple organizations found (${orgData.organizations.map((o) => o.organization_id).join(', ')}). Provide organization_id in the action input.`
                });
            }
            const singleOrg = orgData.organizations[0];
            if (!singleOrg) {
                throw new nango.ActionError({
                    type: 'not_found',
                    message: 'No organizations found for this Zoho Inventory account.'
                });
            }
            organizationId = String(singleOrg.organization_id);
        }

        const contactsResponse = await nango.get({
            // https://www.zoho.com/inventory/api/v1/contacts/#list-contacts
            endpoint: '/inventory/v1/contacts',
            params: {
                organization_id: organizationId,
                contact_name: input.customer_name
            },
            retries: 3
        });

        const contactsData = ContactsResponseSchema.parse(contactsResponse.data);
        if (contactsData.code !== 0) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: contactsData.message ?? 'Failed to look up contacts in Zoho Inventory.',
                code: contactsData.code
            });
        }

        const contacts = contactsData.contacts ?? [];
        const existing = contacts.find((contact) => contact.contact_name === input.customer_name);

        let customerId: string;
        let customerName: string;
        let contactCreated: boolean;

        if (existing) {
            customerId = existing.contact_id;
            customerName = existing.contact_name;
            contactCreated = false;
        } else {
            const createContactResponse = await nango.post({
                // https://www.zoho.com/inventory/api/v1/contacts/#create-a-contact
                endpoint: '/inventory/v1/contacts',
                params: {
                    organization_id: organizationId
                },
                data: {
                    contact_name: input.customer_name,
                    contact_type: 'customer'
                },
                // Non-idempotent create; one retry only to bound duplicate-contact risk.
                retries: 1
            });

            const createdContact = CreatedContactResponseSchema.parse(createContactResponse.data);
            if (createdContact.code !== 0 || !createdContact.contact) {
                throw new nango.ActionError({
                    type: 'provider_error',
                    message: createdContact.message ?? 'Failed to create the customer contact in Zoho Inventory.',
                    code: createdContact.code
                });
            }

            customerId = createdContact.contact.contact_id;
            customerName = createdContact.contact.contact_name ?? input.customer_name;
            contactCreated = true;
        }

        const requestBody: Record<string, unknown> = {
            customer_id: customerId,
            line_items: input.line_items.map((item) => ({
                item_id: item.item_id,
                quantity: item.quantity,
                ...(item.rate !== undefined && { rate: item.rate }),
                ...(item.description !== undefined && { description: item.description }),
                ...(item.tax_id !== undefined && { tax_id: item.tax_id })
            }))
        };

        if (input.salesorder_number !== undefined) {
            requestBody['salesorder_number'] = input.salesorder_number;
        }

        if (input.date !== undefined) {
            requestBody['date'] = input.date;
        }

        if (input.reference_number !== undefined) {
            requestBody['reference_number'] = input.reference_number;
        }

        if (input.notes !== undefined) {
            requestBody['notes'] = input.notes;
        }

        if (input.terms !== undefined) {
            requestBody['terms'] = input.terms;
        }

        const salesorderResponse = await nango.post({
            // https://www.zoho.com/inventory/api/v1/salesorders/#create-a-sales-order
            endpoint: '/inventory/v1/salesorders',
            params: {
                organization_id: organizationId
            },
            data: requestBody,
            // Non-idempotent create; one retry only to bound duplicate-sales-order risk.
            retries: 1
        });

        const salesorderData = SalesOrderResponseSchema.parse(salesorderResponse.data);
        if (salesorderData.code !== 0 || !salesorderData.salesorder) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: salesorderData.message ?? 'Failed to create the sales order in Zoho Inventory.',
                code: salesorderData.code
            });
        }

        const salesorder = salesorderData.salesorder;

        return {
            customer_id: customerId,
            customer_name: salesorder.customer_name ?? customerName,
            contact_created: contactCreated,
            salesorder_id: salesorder.salesorder_id,
            ...(salesorder.salesorder_number != null && { salesorder_number: salesorder.salesorder_number }),
            ...(salesorder.status != null && { status: salesorder.status }),
            ...(salesorder.order_status != null && { order_status: salesorder.order_status }),
            ...(salesorder.date != null && { date: salesorder.date }),
            ...(salesorder.total != null && { total: salesorder.total }),
            ...(salesorder.created_time != null && { created_time: salesorder.created_time })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
