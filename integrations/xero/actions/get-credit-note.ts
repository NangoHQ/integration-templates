import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    credit_note_id: z.string().describe('The unique identifier (GUID) of the credit note to retrieve. Example: "00000000-0000-0000-0000-000000000000"')
});

const ProviderCreditNoteSchema = z
    .object({
        CreditNoteID: z.string(),
        CreditNoteNumber: z.string().optional(),
        Type: z.string().optional(),
        Status: z.string().optional(),
        Reference: z.string().optional(),
        Date: z.string().optional(),
        DueDate: z.string().optional(),
        SubTotal: z.number().optional(),
        TotalTax: z.number().optional(),
        Total: z.number().optional(),
        UpdatedDateUTC: z.string().optional(),
        CurrencyCode: z.string().optional(),
        FullyPaidOnDate: z.string().optional(),
        SentToContact: z.boolean().optional(),
        CurrencyRate: z.number().optional(),
        RemainingCredit: z.number().optional(),
        HasAttachments: z.boolean().optional(),
        HasErrors: z.boolean().optional(),
        LineItems: z.array(z.object({}).passthrough()).optional(),
        Contact: z.object({}).passthrough().optional(),
        Allocations: z.array(z.object({}).passthrough()).optional(),
        Payments: z.array(z.object({}).passthrough()).optional(),
        BrandingThemeID: z.string().optional(),
        StatusAttributeString: z.string().optional(),
        ValidationErrors: z.array(z.object({}).passthrough()).optional(),
        Warnings: z.array(z.object({}).passthrough()).optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    CreditNotes: z.array(ProviderCreditNoteSchema).min(1).max(1)
});

const OutputSchema = z.object({
    credit_note_id: z.string(),
    credit_note_number: z.string().optional(),
    type: z.string().optional(),
    status: z.string().optional(),
    reference: z.string().optional(),
    date: z.string().optional(),
    due_date: z.string().optional(),
    sub_total: z.number().optional(),
    total_tax: z.number().optional(),
    total: z.number().optional(),
    updated_date_utc: z.string().optional(),
    currency_code: z.string().optional(),
    fully_paid_on_date: z.string().optional(),
    sent_to_contact: z.boolean().optional(),
    currency_rate: z.number().optional(),
    remaining_credit: z.number().optional(),
    has_attachments: z.boolean().optional(),
    has_errors: z.boolean().optional(),
    line_items: z.array(z.object({}).passthrough()).optional(),
    contact: z.object({}).passthrough().optional(),
    allocations: z.array(z.object({}).passthrough()).optional(),
    payments: z.array(z.object({}).passthrough()).optional(),
    branding_theme_id: z.string().optional(),
    status_attribute_string: z.string().optional(),
    validation_errors: z.array(z.object({}).passthrough()).optional(),
    warnings: z.array(z.object({}).passthrough()).optional()
});

async function resolveTenantId(nango: {
    getConnection: () => Promise<unknown>;
    get: (config: { endpoint: string; retries: number }) => Promise<{ data: unknown }>;
}): Promise<string> {
    const connection = await nango.getConnection();

    const ConnectionSchema = z.object({
        connection_config: z.record(z.string(), z.unknown()).optional(),
        metadata: z.record(z.string(), z.unknown()).optional()
    });

    const parsedConnection = ConnectionSchema.parse(connection);

    const tenantIdFromConfig =
        parsedConnection.connection_config && typeof parsedConnection.connection_config === 'object' && 'tenant_id' in parsedConnection.connection_config
            ? z.string().safeParse(parsedConnection.connection_config['tenant_id'])
            : undefined;
    if (tenantIdFromConfig && tenantIdFromConfig.success) {
        return tenantIdFromConfig.data;
    }

    const tenantIdFromMetadata =
        parsedConnection.metadata && typeof parsedConnection.metadata === 'object' && 'tenantId' in parsedConnection.metadata
            ? z.string().safeParse(parsedConnection.metadata['tenantId'])
            : undefined;
    if (tenantIdFromMetadata && tenantIdFromMetadata.success) {
        return tenantIdFromMetadata.data;
    }

    // https://developer.xero.com/documentation/api/accounting/connections
    const connectionsResponse = await nango.get({
        endpoint: 'connections',
        retries: 10
    });

    const ConnectionsSchema = z.array(z.object({ tenantId: z.string() }));

    const parsedConnections = ConnectionsSchema.parse(connectionsResponse.data);

    if (parsedConnections.length === 0) {
        throw new Error('No Xero tenants found for this connection.');
    }

    if (parsedConnections.length > 1) {
        throw new Error('Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.');
    }

    const firstConnection = parsedConnections[0];
    if (!firstConnection) {
        throw new Error('No Xero tenants found for this connection.');
    }

    return firstConnection.tenantId;
}

const action = createAction({
    description: 'Retrieve a credit note by CreditNoteID.',
    version: '1.0.0',
    endpoint: {
        method: 'GET',
        path: '/actions/get-credit-note',
        group: 'Credit Notes'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['accounting.transactions.read', 'accounting.transactions'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const tenantId = await resolveTenantId(nango);

        // https://developer.xero.com/documentation/api/accounting/creditnotes
        const response = await nango.get({
            endpoint: `api.xro/2.0/CreditNotes/${input.credit_note_id}`,
            headers: {
                'xero-tenant-id': tenantId
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const note = providerResponse.CreditNotes[0];
        if (!note) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Credit note with ID ${input.credit_note_id} was not found.`
            });
        }

        return {
            credit_note_id: note.CreditNoteID,
            ...(note.CreditNoteNumber !== undefined && { credit_note_number: note.CreditNoteNumber }),
            ...(note.Type !== undefined && { type: note.Type }),
            ...(note.Status !== undefined && { status: note.Status }),
            ...(note.Reference !== undefined && { reference: note.Reference }),
            ...(note.Date !== undefined && { date: note.Date }),
            ...(note.DueDate !== undefined && { due_date: note.DueDate }),
            ...(note.SubTotal !== undefined && { sub_total: note.SubTotal }),
            ...(note.TotalTax !== undefined && { total_tax: note.TotalTax }),
            ...(note.Total !== undefined && { total: note.Total }),
            ...(note.UpdatedDateUTC !== undefined && { updated_date_utc: note.UpdatedDateUTC }),
            ...(note.CurrencyCode !== undefined && { currency_code: note.CurrencyCode }),
            ...(note.FullyPaidOnDate !== undefined && { fully_paid_on_date: note.FullyPaidOnDate }),
            ...(note.SentToContact !== undefined && { sent_to_contact: note.SentToContact }),
            ...(note.CurrencyRate !== undefined && { currency_rate: note.CurrencyRate }),
            ...(note.RemainingCredit !== undefined && { remaining_credit: note.RemainingCredit }),
            ...(note.HasAttachments !== undefined && { has_attachments: note.HasAttachments }),
            ...(note.HasErrors !== undefined && { has_errors: note.HasErrors }),
            ...(note.LineItems !== undefined && { line_items: note.LineItems }),
            ...(note.Contact !== undefined && { contact: note.Contact }),
            ...(note.Allocations !== undefined && { allocations: note.Allocations }),
            ...(note.Payments !== undefined && { payments: note.Payments }),
            ...(note.BrandingThemeID !== undefined && { branding_theme_id: note.BrandingThemeID }),
            ...(note.StatusAttributeString !== undefined && { status_attribute_string: note.StatusAttributeString }),
            ...(note.ValidationErrors !== undefined && { validation_errors: note.ValidationErrors }),
            ...(note.Warnings !== undefined && { warnings: note.Warnings })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
