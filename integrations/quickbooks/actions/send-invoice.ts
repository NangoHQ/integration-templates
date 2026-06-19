import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    invoiceId: z.string().describe('The ID of the invoice to send. Example: "123"'),
    emailTo: z
        .string()
        .optional()
        .describe('Optional email address to send the invoice to. If not provided, the invoice will be sent to the customer email address.')
});

const OutputSchema = z.object({
    success: z.boolean().describe('Whether the invoice was sent successfully'),
    invoiceId: z.string().describe('The ID of the sent invoice'),
    message: z.string().optional().describe('Status message from QuickBooks')
});

// QuickBooks API response schema for the send endpoint
// Response can vary - it may return the invoice or a simple success indicator
const SendResponseSchema = z.object({
    Invoice: z
        .object({
            Id: z.string().optional(),
            MetaData: z
                .object({
                    LastUpdatedTime: z.string().optional()
                })
                .optional()
        })
        .optional(),
    status: z.string().optional()
});

const action = createAction({
    description: 'Email an invoice using QuickBooks delivery settings',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['com.intuit.quickbooks.accounting'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Resolve realmId from connection configuration
        // https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/invoice
        const connection = await nango.getConnection();
        const realmId = connection.connection_config['realmId'];

        if (!realmId) {
            throw new nango.ActionError({
                type: 'invalid_connection',
                message: 'realmId not found in the connection configuration. Please reauthenticate to set the realmId'
            });
        }

        const sendConfig: {
            endpoint: string;
            params?: Record<string, string>;
            retries: number;
        } = {
            // https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/invoice#send-an-invoice
            endpoint: `/v3/company/${encodeURIComponent(realmId)}/invoice/${encodeURIComponent(input.invoiceId)}/send`,
            retries: 3
        };

        // Add emailTo parameter if provided for email override
        if (input.emailTo) {
            sendConfig.params = {
                sendTo: input.emailTo
            };
        }

        const response = await nango.post(sendConfig);

        // Parse the response to validate structure
        const parsedResponse = SendResponseSchema.parse(response.data);

        // Determine success based on response structure
        const success = parsedResponse.Invoice?.Id !== undefined || parsedResponse.status === 'Sent' || response.status === 200;

        return {
            success,
            invoiceId: input.invoiceId,
            message: success ? 'Invoice sent successfully' : 'Invoice sending status unclear'
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
