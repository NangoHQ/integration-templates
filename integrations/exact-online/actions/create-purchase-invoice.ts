import { z } from 'zod';
import { createAction } from 'nango';

const PurchaseEntryLineInputSchema = z.object({
    glAccountId: z.string().describe('GL Account ID. Example: "74752c10-3d31-4725-a66d-001edba8c47f"'),
    amountDc: z.number().describe('Amount in default currency. Positive for debit, negative for credit.'),
    vatCode: z.string().describe('VAT Code string. Example: "AB"'),
    description: z.string().optional().describe('Line description')
});

const InputSchema = z.object({
    journalCode: z.string().describe('Journal code for purchase entries. Example: "60"'),
    supplierId: z.string().describe('Supplier account ID. Example: "454a5d46-ee70-4ed1-9375-9cfedeb138cd"'),
    entryDate: z.string().describe('Entry date in ISO format YYYY-MM-DD. Example: "2024-05-30"'),
    description: z.string().optional().describe('Entry description'),
    paymentTermId: z.string().optional().describe('Payment term ID'),
    purchaseEntryLines: z.array(PurchaseEntryLineInputSchema).min(1).describe('Purchase entry lines')
});

const ProviderPurchaseEntryLineSchema = z.object({
    ID: z.string().optional().nullable(),
    GLAccount: z.string().optional().nullable(),
    AmountDC: z.number().optional().nullable(),
    VATCode: z.string().optional().nullable(),
    Description: z.string().optional().nullable()
});

const ProviderPurchaseEntrySchema = z.object({
    EntryID: z.string().optional().nullable(),
    ID: z.string().optional().nullable(),
    EntryNumber: z.number().optional().nullable(),
    Journal: z.string().optional().nullable(),
    Supplier: z.string().optional().nullable(),
    EntryDate: z.string().optional().nullable(),
    Description: z.string().optional().nullable(),
    PaymentTerm: z.string().optional().nullable(),
    PurchaseEntryLines: z.unknown().optional().nullable(),
    __metadata: z
        .object({
            uri: z.string().optional().nullable()
        })
        .optional()
        .nullable()
});

const OutputSchema = z.object({
    entryId: z.string().optional().describe('The created purchase entry ID'),
    id: z.string().optional().describe('The created purchase entry ID (alias)'),
    entryNumber: z.number().optional().describe('The assigned entry number'),
    journal: z.string().optional().describe('Journal code'),
    supplier: z.string().optional().describe('Supplier account ID'),
    entryDate: z.string().optional().describe('Entry date'),
    description: z.string().optional().describe('Entry description'),
    paymentTerm: z.string().optional().describe('Payment term ID'),
    purchaseEntryLines: z
        .array(
            z.object({
                id: z.string().optional().describe('Line ID'),
                glAccount: z.string().optional().describe('GL Account ID'),
                amountDc: z.number().optional().describe('Amount in default currency'),
                vatCode: z.string().optional().describe('VAT Code string'),
                description: z.string().optional().describe('Line description')
            })
        )
        .optional()
        .describe('Purchase entry lines')
});

const action = createAction({
    description: 'Create a new purchase invoice/entry',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['purchaseentry.PurchaseEntries'],
    endpoint: {
        path: '/actions/create-purchase-invoice',
        method: 'POST'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://start.exactonline.fr/docs/HlpRestAPIResourcesDetails?name=SystemUsers
        const meResponse = await nango.get({
            endpoint: '/api/v1/current/Me',
            retries: 3
        });

        const meDataSchema = z.object({
            d: z
                .object({
                    results: z
                        .array(
                            z.object({
                                CurrentDivision: z.number().optional().nullable()
                            })
                        )
                        .optional()
                        .nullable()
                })
                .optional()
                .nullable()
        });

        const meData = meDataSchema.parse(meResponse.data);
        const currentDivision = meData.d?.results?.[0]?.CurrentDivision;

        if (!currentDivision) {
            throw new nango.ActionError({
                type: 'missing_division',
                message: 'Could not determine current division from user profile'
            });
        }

        const postData = {
            Journal: input.journalCode,
            Supplier: input.supplierId,
            EntryDate: input.entryDate,
            ...(input.description !== undefined && { Description: input.description }),
            ...(input.paymentTermId !== undefined && { PaymentTerm: input.paymentTermId }),
            PurchaseEntryLines: input.purchaseEntryLines.map((line) => ({
                GLAccount: line.glAccountId,
                AmountDC: line.amountDc,
                VATCode: line.vatCode,
                ...(line.description !== undefined && { Description: line.description })
            }))
        };

        // https://start.exactonline.fr/docs/HlpRestAPIResourcesDetails?name=PurchaseEntryPurchaseEntries
        const response = await nango.post({
            endpoint: `/api/v1/${encodeURIComponent(currentDivision.toString())}/purchaseentry/PurchaseEntries`,
            data: postData,
            retries: 3
        });

        const rawResponse = response.data;
        let providerEntry: z.infer<typeof ProviderPurchaseEntrySchema>;

        if (rawResponse && typeof rawResponse === 'object') {
            if ('d' in rawResponse && rawResponse.d && typeof rawResponse.d === 'object') {
                providerEntry = ProviderPurchaseEntrySchema.parse(rawResponse.d);
            } else {
                providerEntry = ProviderPurchaseEntrySchema.parse(rawResponse);
            }
        } else {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Invalid response from Exact Online API when creating purchase entry'
            });
        }

        const hasNullData = !providerEntry.EntryID && !providerEntry.ID && !providerEntry.EntryNumber;
        const metadataUri = providerEntry.__metadata?.uri;

        if (hasNullData && metadataUri) {
            const idMatch = metadataUri.match(/PurchaseEntries\(guid'([^']+)'\)/);
            const extractedId = idMatch ? idMatch[1] : null;

            if (extractedId) {
                // https://start.exactonline.fr/docs/HlpRestAPIResourcesDetails?name=PurchaseEntryPurchaseEntries
                const fetchResponse = await nango.get({
                    endpoint: `/api/v1/${encodeURIComponent(currentDivision.toString())}/purchaseentry/PurchaseEntries(guid'${encodeURIComponent(extractedId)}')`,
                    retries: 3
                });

                const fetchRaw = fetchResponse.data;
                if (fetchRaw && typeof fetchRaw === 'object') {
                    if ('d' in fetchRaw && fetchRaw.d && typeof fetchRaw.d === 'object') {
                        providerEntry = ProviderPurchaseEntrySchema.parse(fetchRaw.d);
                    } else {
                        providerEntry = ProviderPurchaseEntrySchema.parse(fetchRaw);
                    }
                }
            }
        }

        const purchaseEntryLines: Array<{
            id: string | undefined;
            glAccount: string | undefined;
            amountDc: number | undefined;
            vatCode: string | undefined;
            description: string | undefined;
        }> = [];

        if (Array.isArray(providerEntry.PurchaseEntryLines)) {
            for (const line of providerEntry.PurchaseEntryLines) {
                const parsedLine = ProviderPurchaseEntryLineSchema.safeParse(line);
                if (parsedLine.success) {
                    purchaseEntryLines.push({
                        id: parsedLine.data.ID ?? undefined,
                        glAccount: parsedLine.data.GLAccount ?? undefined,
                        amountDc: parsedLine.data.AmountDC ?? undefined,
                        vatCode: parsedLine.data.VATCode ?? undefined,
                        description: parsedLine.data.Description ?? undefined
                    });
                }
            }
        }

        return {
            entryId: providerEntry.EntryID ?? providerEntry.ID ?? undefined,
            id: providerEntry.EntryID ?? providerEntry.ID ?? undefined,
            entryNumber: providerEntry.EntryNumber ?? undefined,
            journal: providerEntry.Journal ?? undefined,
            supplier: providerEntry.Supplier ?? undefined,
            entryDate: providerEntry.EntryDate ?? undefined,
            description: providerEntry.Description ?? undefined,
            ...(providerEntry.PaymentTerm !== undefined && providerEntry.PaymentTerm !== null && { paymentTerm: providerEntry.PaymentTerm }),
            ...(purchaseEntryLines.length > 0 && { purchaseEntryLines })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
