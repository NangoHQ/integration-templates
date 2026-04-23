import { createSync } from 'nango';
import { z } from 'zod';

// CreditNoteLineItem schema for individual line items within a credit note
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

type CreditNoteLineItem = z.infer<typeof CreditNoteLineItemSchema>;

// CreditNote schema based on Xero API response
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

type CreditNote = z.infer<typeof CreditNoteSchema>;

// Checkpoint schema for incremental sync
// Note: Must use z.string(), not z.string().optional() to match ZodCheckpoint type
const CheckpointSchema = z.object({
    updatedAfter: z.string()
});

type Checkpoint = z.infer<typeof CheckpointSchema>;

// Connections API response schema
const ConnectionsResponseSchema = z.array(
    z.object({
        tenantId: z.string()
    })
);

// Schema for extracting values from unknown objects
const RecordValueSchema = z.object({}).passthrough();

// Helper to safely get property from unknown object
function getProperty(obj: unknown, key: string): unknown {
    const parsed = RecordValueSchema.safeParse(obj);
    if (parsed.success && key in parsed.data) {
        return parsed.data[key];
    }
    return undefined;
}

const sync = createSync({
    description: 'Sync credit notes from Xero',
    version: '1.0.0',
    endpoints: [{ method: 'GET', path: '/syncs/sync-credit-notes' }],
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        CreditNote: CreditNoteSchema
    },

    exec: async (nango) => {
        // Resolve tenant ID according to the specified priority
        let tenantId: string | undefined;

        // 1. Check connection.connection_config['tenant_id']
        const connection = await nango.getConnection();
        if (connection.connection_config && typeof connection.connection_config === 'object') {
            const tenantIdValue = getProperty(connection.connection_config, 'tenant_id');
            if (typeof tenantIdValue === 'string') {
                tenantId = tenantIdValue;
            }
        }

        // 2. Check connection.metadata['tenantId'] (set externally by get-tenants action)
        if (!tenantId && connection.metadata && typeof connection.metadata === 'object') {
            const tenantIdValue = getProperty(connection.metadata, 'tenantId');
            if (typeof tenantIdValue === 'string') {
                tenantId = tenantIdValue;
            }
        }

        // 3. Call GET connections to get tenant info
        if (!tenantId) {
            // https://developer.xero.com/documentation/api/accounting/overview#get-connections
            const connectionsResponse = await nango.get({
                endpoint: 'connections',
                retries: 10
            });

            const parsedConnections = ConnectionsResponseSchema.safeParse(connectionsResponse.data);
            if (!parsedConnections.success) {
                throw new Error('Failed to parse connections response');
            }

            const connections = parsedConnections.data;

            if (connections.length === 0) {
                throw new Error('No tenants found for this Xero connection');
            }

            if (connections.length > 1) {
                throw new Error('Multiple tenants found. Please use the get-tenants action to set the chosen tenantId in the metadata.');
            }

            const firstConnection = connections[0];
            if (firstConnection) {
                tenantId = firstConnection.tenantId;
            }
        }

        if (!tenantId) {
            throw new Error('Unable to resolve Xero tenant ID');
        }

        // Get checkpoint for incremental sync
        const checkpointResponse = await nango.getCheckpoint();
        const checkpointParseResult = CheckpointSchema.safeParse(checkpointResponse);
        const checkpoint = checkpointParseResult.success ? checkpointParseResult.data : null;

        // Configure proxy for CreditNotes endpoint
        // https://developer.xero.com/documentation/api/accounting/creditnotes
        const proxyConfig: {
            endpoint: string;
            headers: Record<string, string>;
            paginate: {
                type: 'offset';
                response_path: string;
                offset_name_in_request: string;
                offset_start_value: number;
                offset_calculation_method: 'per-page';
                limit: number;
            };
            retries: number;
        } = {
            endpoint: 'api.xro/2.0/CreditNotes',
            headers: {
                'xero-tenant-id': tenantId
            },
            paginate: {
                type: 'offset',
                response_path: 'CreditNotes',
                offset_name_in_request: 'page',
                offset_start_value: 1,
                offset_calculation_method: 'per-page',
                limit: 100
            },
            retries: 3
        };

        // Add If-Modified-Since header if checkpoint exists
        if (checkpoint && checkpoint.updatedAfter) {
            proxyConfig.headers['If-Modified-Since'] = checkpoint.updatedAfter;
        }

        let lastUpdatedDate: string | undefined = checkpoint ? checkpoint.updatedAfter : undefined;

        // Paginate through credit notes
        for await (const page of nango.paginate(proxyConfig)) {
            const creditNotes: CreditNote[] = [];

            for (const rawRecord of page) {
                const record = RecordValueSchema.safeParse(rawRecord);
                if (!record.success) {
                    continue;
                }

                const recordData = record.data;

                // Extract and validate required fields
                const creditNoteId = recordData['CreditNoteID'];
                const updatedDateUtc = recordData['UpdatedDateUTC'];

                if (typeof creditNoteId !== 'string' || typeof updatedDateUtc !== 'string') {
                    continue;
                }

                // Helper to get optional string value
                const getOptString = (key: string): string | undefined => {
                    const val = recordData[key];
                    return typeof val === 'string' ? val : undefined;
                };

                // Helper to get optional number value
                const getOptNumber = (key: string): number | undefined => {
                    const val = recordData[key];
                    return typeof val === 'number' ? val : undefined;
                };

                // Build the credit note object
                const creditNote: CreditNote = {
                    id: creditNoteId,
                    CreditNoteID: creditNoteId,
                    CreditNoteNumber: getOptString('CreditNoteNumber'),
                    Type: getOptString('Type'),
                    Reference: getOptString('Reference'),
                    Status: getOptString('Status'),
                    Date: getOptString('Date'),
                    DueDate: getOptString('DueDate'),
                    UpdatedDateUTC: updatedDateUtc,
                    CurrencyCode: getOptString('CurrencyCode'),
                    SubTotal: getOptNumber('SubTotal'),
                    TotalTax: getOptNumber('TotalTax'),
                    Total: getOptNumber('Total'),
                    CurrencyRate: getOptNumber('CurrencyRate'),
                    RemainingCredit: getOptNumber('RemainingCredit')
                };

                // Handle Contact object
                const contactRaw = recordData['Contact'];
                if (contactRaw && typeof contactRaw === 'object' && !Array.isArray(contactRaw)) {
                    const contactParsed = RecordValueSchema.safeParse(contactRaw);
                    if (contactParsed.success) {
                        const contactId = contactParsed.data['ContactID'];
                        const contactName = contactParsed.data['Name'];
                        creditNote.Contact = {
                            ContactID: typeof contactId === 'string' ? contactId : undefined,
                            Name: typeof contactName === 'string' ? contactName : undefined
                        };
                    }
                }

                // Handle LineItems array
                const lineItemsRaw = recordData['LineItems'];
                if (Array.isArray(lineItemsRaw)) {
                    const mappedItems: CreditNoteLineItem[] = [];
                    for (const item of lineItemsRaw) {
                        const itemParsed = RecordValueSchema.safeParse(item);
                        if (itemParsed.success) {
                            const itemData = itemParsed.data;
                            const getItemString = (key: string): string | undefined => {
                                const val = itemData[key];
                                return typeof val === 'string' ? val : undefined;
                            };
                            const getItemNumber = (key: string): number | undefined => {
                                const val = itemData[key];
                                return typeof val === 'number' ? val : undefined;
                            };
                            mappedItems.push({
                                LineItemID: getItemString('LineItemID'),
                                Description: getItemString('Description'),
                                Quantity: getItemNumber('Quantity'),
                                UnitAmount: getItemNumber('UnitAmount'),
                                AccountCode: getItemString('AccountCode'),
                                TaxType: getItemString('TaxType'),
                                TaxAmount: getItemNumber('TaxAmount'),
                                LineAmount: getItemNumber('LineAmount'),
                                DiscountRate: getItemNumber('DiscountRate')
                            });
                        }
                    }
                    creditNote.LineItems = mappedItems;
                }

                creditNotes.push(creditNote);

                // Track the latest UpdatedDateUTC
                if (!lastUpdatedDate || updatedDateUtc > lastUpdatedDate) {
                    lastUpdatedDate = updatedDateUtc;
                }
            }

            if (creditNotes.length > 0) {
                await nango.batchSave(creditNotes, 'CreditNote');
            }

            // Save checkpoint after each page
            if (lastUpdatedDate) {
                const newCheckpoint: Checkpoint = {
                    updatedAfter: lastUpdatedDate
                };
                await nango.saveCheckpoint(newCheckpoint);
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
