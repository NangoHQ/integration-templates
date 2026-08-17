import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        invoice_id: z.string().describe('The Xero Invoice ID to delete or void. Example: "00000000-0000-0000-0000-000000000000"')
    })
    .describe('Input to delete or void a Xero invoice.');

const OutputSchema = z
    .object({
        invoice_id: z.string().describe('The Xero Invoice ID.'),
        status: z.string().describe('The new invoice status, either "DELETED" or "VOIDED".'),
        invoice_number: z.string().optional().describe('The human-readable invoice number, if returned by the provider.')
    })
    .describe('Result of deleting or voiding a Xero invoice.');

const ConnectionSchema = z.object({
    connection_config: z.record(z.string(), z.unknown()).nullish(),
    metadata: z.record(z.string(), z.unknown()).nullish()
});

const ConnectionsResponseSchema = z.array(z.record(z.string(), z.unknown()));

const InvoiceSchema = z.object({
    InvoiceID: z.string().optional(),
    Status: z.string().optional(),
    InvoiceNumber: z.string().optional()
});

const InvoicesResponseSchema = z.object({
    Invoices: z.array(InvoiceSchema).optional()
});

/**
 * @tags: [read, write, destructive]
 * @tagReason: Reads the existing invoice to determine its current status, then mutates it to DELETED or VOIDED on the provider. This change is difficult to reverse.
 * @pitfalls: Draft and submitted invoices become DELETED; authorised ones become VOIDED. Already-finalised invoices raise an error. The invoice remains gettable by ID after the call — detect deletion by checking the Status field, not HTTP status.
 */
const action = createAction({
    description: 'Delete a draft or submitted invoice, or void an authorised one — Xero has no hard-delete for invoices.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.invoices'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connectionResponse = await nango.getConnection();
        const connection = ConnectionSchema.parse(connectionResponse);

        let tenantId: string | undefined;
        const connectionConfig = connection.connection_config;
        if (
            connectionConfig &&
            typeof connectionConfig === 'object' &&
            'tenant_id' in connectionConfig &&
            typeof connectionConfig['tenant_id'] === 'string' &&
            connectionConfig['tenant_id'].length > 0
        ) {
            tenantId = connectionConfig['tenant_id'];
        }

        if (!tenantId) {
            const metadata = connection.metadata;
            if (
                metadata &&
                typeof metadata === 'object' &&
                'tenantId' in metadata &&
                typeof metadata['tenantId'] === 'string' &&
                metadata['tenantId'].length > 0
            ) {
                tenantId = metadata['tenantId'];
            }
        }

        if (!tenantId) {
            // https://developer.xero.com/documentation/api/accounting/overview
            const connectionsResp = await nango.get({
                endpoint: 'connections',
                retries: 10
            });
            const parsedConnections = ConnectionsResponseSchema.parse(connectionsResp.data);

            if (parsedConnections.length === 0) {
                throw new nango.ActionError({
                    type: 'missing_tenant',
                    message: 'No Xero tenants found for this connection.'
                });
            }

            if (parsedConnections.length > 1) {
                throw new nango.ActionError({
                    type: 'multiple_tenants',
                    message: 'Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.'
                });
            }

            const firstConnection = parsedConnections[0];
            if (
                firstConnection &&
                typeof firstConnection === 'object' &&
                'tenantId' in firstConnection &&
                typeof firstConnection['tenantId'] === 'string' &&
                firstConnection['tenantId'].length > 0
            ) {
                tenantId = firstConnection['tenantId'];
            }
        }

        if (!tenantId) {
            throw new nango.ActionError({
                type: 'missing_tenant',
                message: 'Unable to resolve xero-tenant-id.'
            });
        }

        // https://developer.xero.com/documentation/api/accounting/invoices
        const getResponse = await nango.get({
            endpoint: `api.xro/2.0/Invoices/${encodeURIComponent(input.invoice_id)}`,
            headers: {
                'xero-tenant-id': tenantId
            },
            retries: 3
        });

        const parsedGet = InvoicesResponseSchema.parse(getResponse.data);
        const invoices = parsedGet.Invoices || [];
        if (invoices.length === 0) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Invoice ${input.invoice_id} not found.`
            });
        }

        const invoice = invoices[0];
        if (!invoice) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Invoice ${input.invoice_id} not found.`
            });
        }

        const currentStatus = invoice.Status;

        if (!currentStatus) {
            throw new nango.ActionError({
                type: 'unknown_status',
                message: 'Could not determine current invoice status.'
            });
        }

        if (currentStatus === 'DELETED' || currentStatus === 'VOIDED') {
            throw new nango.ActionError({
                type: 'already_finalised',
                message: `Invoice is already ${currentStatus}.`
            });
        }

        let targetStatus: string;
        if (currentStatus === 'DRAFT' || currentStatus === 'SUBMITTED') {
            targetStatus = 'DELETED';
        } else if (currentStatus === 'AUTHORISED') {
            targetStatus = 'VOIDED';
        } else {
            throw new nango.ActionError({
                type: 'unsupported_status',
                message: `Invoice status "${currentStatus}" cannot be deleted or voided.`
            });
        }

        // https://developer.xero.com/documentation/api/accounting/invoices
        const postResponse = await nango.post({
            endpoint: `api.xro/2.0/Invoices/${encodeURIComponent(input.invoice_id)}`,
            headers: {
                'xero-tenant-id': tenantId
            },
            data: {
                Status: targetStatus
            },
            retries: 1
        });

        const parsedPost = InvoicesResponseSchema.parse(postResponse.data);
        const updatedInvoices = parsedPost.Invoices || [];
        if (updatedInvoices.length === 0) {
            throw new nango.ActionError({
                type: 'update_failed',
                message: 'Invoice update did not return any data.'
            });
        }

        const updatedInvoice = updatedInvoices[0];
        if (!updatedInvoice) {
            throw new nango.ActionError({
                type: 'update_failed',
                message: 'Invoice update did not return any data.'
            });
        }

        const updatedStatus = updatedInvoice.Status || targetStatus;
        const invoiceNumber = updatedInvoice.InvoiceNumber;

        return {
            invoice_id: input.invoice_id,
            status: updatedStatus,
            ...(invoiceNumber !== undefined && { invoice_number: invoiceNumber })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
