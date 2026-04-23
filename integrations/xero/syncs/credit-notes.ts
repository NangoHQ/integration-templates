import { createSync } from 'nango';
import { z } from 'zod';

const CreditNoteLineItemSchema = z.object({
    LineItemID: z.string().optional(),
    Description: z.string().optional(),
    Quantity: z.number().optional(),
    UnitAmount: z.number().optional(),
    AccountCode: z.string().optional(),
    TaxType: z.string().optional(),
    TaxAmount: z.number().optional(),
    LineAmount: z.number().optional(),
    DiscountRate: z.number().optional()
});

const CreditNoteSchema = z.object({
    id: z.string(),
    CreditNoteID: z.string(),
    CreditNoteNumber: z.string().optional(),
    Type: z.string().optional(),
    Reference: z.string().optional(),
    Status: z.string().optional(),
    Contact: z
        .object({
            ContactID: z.string().optional(),
            Name: z.string().optional()
        })
        .passthrough()
        .optional(),
    Date: z.string().optional(),
    DueDate: z.string().optional(),
    LineItems: z.array(CreditNoteLineItemSchema).optional(),
    SubTotal: z.number().optional(),
    TotalTax: z.number().optional(),
    Total: z.number().optional(),
    UpdatedDateUTC: z.string(),
    CurrencyCode: z.string().optional(),
    CurrencyRate: z.number().optional(),
    RemainingCredit: z.number().optional()
});

const CheckpointSchema = z.object({
    updatedAfter: z.string()
});

const ConnectionsResponseSchema = z.array(
    z.object({
        tenantId: z.string()
    })
);

const XeroCreditNoteSchema = z.record(z.string(), z.unknown());

const sync = createSync({
    description: 'Sync credit notes from Xero',
    version: '3.0.0',
    endpoints: [{ method: 'GET', path: '/syncs/credit-notes' }],
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        CreditNote: CreditNoteSchema
    },

    exec: async (nango) => {
        const connection = await nango.getConnection();

        let tenantId: string | undefined;

        const configParse = z.object({ tenant_id: z.string().optional() }).safeParse(connection.connection_config);
        if (configParse.success && configParse.data.tenant_id) tenantId = configParse.data.tenant_id;

        if (!tenantId) {
            const metaParse = z.object({ tenantId: z.string().optional() }).safeParse(connection.metadata);
            if (metaParse.success && metaParse.data.tenantId) tenantId = metaParse.data.tenantId;
        }

        if (!tenantId) {
            // https://developer.xero.com/documentation/api/accounting/overview#get-connections
            const connectionsResponse = await nango.get({ endpoint: 'connections', retries: 10 });
            const connections = ConnectionsResponseSchema.parse(connectionsResponse.data);

            if (connections.length === 0) {
                throw new Error('No tenants found for this Xero connection');
            }
            if (connections.length > 1) {
                throw new Error('Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.');
            }

            tenantId = connections[0]?.tenantId;
        }

        if (!tenantId) {
            throw new Error('Unable to resolve Xero tenant ID');
        }

        const checkpoint = await nango.getCheckpoint();
        const isIncremental = checkpoint && checkpoint.updatedAfter.length > 0;

        const headers: Record<string, string> = {
            'xero-tenant-id': tenantId
        };

        if (isIncremental) {
            headers['If-Modified-Since'] = checkpoint.updatedAfter;
        }

        let latestUpdatedDateUTC = checkpoint?.updatedAfter ?? '';

        // https://developer.xero.com/documentation/api/accounting/creditnotes
        for await (const page of nango.paginate({
            endpoint: 'api.xro/2.0/CreditNotes',
            headers,
            params: {
                includeArchived: isIncremental ? 'true' : 'false'
            },
            paginate: {
                type: 'offset',
                response_path: 'CreditNotes',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                limit_name_in_request: 'pageSize',
                offset_calculation_method: 'per-page',
                limit: 100
            },
            retries: 10
        })) {
            const creditNotes = page
                .map((raw) => {
                    const record = XeroCreditNoteSchema.safeParse(raw);
                    if (!record.success) return null;

                    const r = record.data;
                    const creditNoteId = r['CreditNoteID'];
                    const updatedDateUTC = r['UpdatedDateUTC'];

                    if (typeof creditNoteId !== 'string' || typeof updatedDateUTC !== 'string') return null;

                    if (updatedDateUTC > latestUpdatedDateUTC) {
                        latestUpdatedDateUTC = updatedDateUTC;
                    }

                    const getString = (key: string): string | undefined => {
                        const v = r[key];
                        return typeof v === 'string' ? v : undefined;
                    };
                    const getNumber = (key: string): number | undefined => {
                        const v = r[key];
                        return typeof v === 'number' ? v : undefined;
                    };

                    const contact = r['Contact'];
                    const lineItemsRaw = r['LineItems'];

                    const contactParsed = z.object({ ContactID: z.string().optional(), Name: z.string().optional() }).safeParse(contact);

                    return {
                        id: creditNoteId,
                        CreditNoteID: creditNoteId,
                        CreditNoteNumber: getString('CreditNoteNumber'),
                        Type: getString('Type'),
                        Reference: getString('Reference'),
                        Status: getString('Status'),
                        Date: getString('Date'),
                        DueDate: getString('DueDate'),
                        UpdatedDateUTC: updatedDateUTC,
                        CurrencyCode: getString('CurrencyCode'),
                        SubTotal: getNumber('SubTotal'),
                        TotalTax: getNumber('TotalTax'),
                        Total: getNumber('Total'),
                        CurrencyRate: getNumber('CurrencyRate'),
                        RemainingCredit: getNumber('RemainingCredit'),
                        Contact: contactParsed.success ? { ContactID: contactParsed.data.ContactID, Name: contactParsed.data.Name } : undefined,
                        LineItems: Array.isArray(lineItemsRaw)
                            ? lineItemsRaw
                                  .map((item) => {
                                      const parsed = XeroCreditNoteSchema.safeParse(item);
                                      if (!parsed.success) return null;
                                      const d = parsed.data;
                                      return {
                                          LineItemID: typeof d['LineItemID'] === 'string' ? d['LineItemID'] : undefined,
                                          Description: typeof d['Description'] === 'string' ? d['Description'] : undefined,
                                          Quantity: typeof d['Quantity'] === 'number' ? d['Quantity'] : undefined,
                                          UnitAmount: typeof d['UnitAmount'] === 'number' ? d['UnitAmount'] : undefined,
                                          AccountCode: typeof d['AccountCode'] === 'string' ? d['AccountCode'] : undefined,
                                          TaxType: typeof d['TaxType'] === 'string' ? d['TaxType'] : undefined,
                                          TaxAmount: typeof d['TaxAmount'] === 'number' ? d['TaxAmount'] : undefined,
                                          LineAmount: typeof d['LineAmount'] === 'number' ? d['LineAmount'] : undefined,
                                          DiscountRate: typeof d['DiscountRate'] === 'number' ? d['DiscountRate'] : undefined
                                      };
                                  })
                                  .filter((item): item is NonNullable<typeof item> => item !== null)
                            : undefined
                    };
                })
                .filter((cn): cn is NonNullable<typeof cn> => cn !== null);

            const activeCreditNotes = creditNotes.filter((cn) => cn.Status !== 'DELETED' && cn.Status !== 'VOIDED');
            await nango.batchSave(activeCreditNotes, 'CreditNote');

            if (isIncremental) {
                const deletedCreditNotes = creditNotes.filter((cn) => cn.Status === 'DELETED' || cn.Status === 'VOIDED');
                await nango.batchDelete(deletedCreditNotes, 'CreditNote');
            }
        }

        if (latestUpdatedDateUTC !== (checkpoint?.updatedAfter ?? '')) {
            await nango.saveCheckpoint({ updatedAfter: latestUpdatedDateUTC });
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
