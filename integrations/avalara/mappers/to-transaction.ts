import { stringToDate } from '../helpers/date.js';
import { div100 } from '../helpers/math.js';
import type { Address, CreateTransaction, InvoiceCoupon, InvoiceLineItem, NangoAction } from '../../models.js';
import { createTransactionSchema } from '../schema.js';
import type { AvalaraAddresses, AvalaraLineInputItem, AvalaraTransactionInput } from '../types.js';

let lineNumberCounter = 1;

/**
 * Calculates and adds discount line items to the lines array.
 */
function handleDiscounts(coupons: InvoiceCoupon[], lines: AvalaraLineInputItem[]): void {
    const discountAmount = coupons.reduce((acc, { discountAmount }) => acc + discountAmount, 0);

    if (discountAmount > 0) {
        lines.push({
            number: (lineNumberCounter++).toString(),
            quantity: 1,
            amount: -div100(discountAmount),
            taxCode: 'DISCOUNT',
            itemCode: `DISCOUNT${lineNumberCounter}`,
            description: coupons.map(({ name }) => name).join(', ') || 'Discount applied'
        });
    }
}

function mapLineItems(lineItem: InvoiceLineItem): AvalaraLineInputItem[] {
    const aggregatedItems: Record<string, AvalaraLineInputItem> = {};

    lineItem.invoiceLineItemTiers.forEach((tier) => {
        const key = `${lineItem.name}-${lineItem.description || ''}`;
        const unitCount = parseInt(tier.unitCount);
        const unitAmount = div100(parseInt(tier.unitAmount));

        if (!aggregatedItems[key]) {
            aggregatedItems[key] = {
                number: (lineNumberCounter++).toString(),
                quantity: 0,
                amount: 0,
                taxCode: lineItem.taxRate?.toString() || '',
                itemCode: lineItem.name,
                description: `${lineItem.name}${lineItem.description ? ` - ${lineItem.description}` : ''}`
            };
        }

        aggregatedItems[key].quantity = (aggregatedItems[key].quantity || 0) + unitCount;
        aggregatedItems[key].amount += unitAmount;
    });

    return Object.values(aggregatedItems);
}

export function toTransaction(nango: NangoAction, input: CreateTransaction): AvalaraTransactionInput {
    const { success, data: validatedInvoice, error } = createTransactionSchema.safeParse(input);

    if (!success) {
        throw new nango.ActionError({
            message: 'Invalid input',
            errors: error
        });
    }

    const lines = validatedInvoice.invoice.invoiceLineItems.flatMap(mapLineItems);
    handleDiscounts(validatedInvoice.invoice.coupons, lines);

    const commit = ['paid', 'late', 'voided'].includes(validatedInvoice.invoice.status);

    const addressKeys: (
        | 'singleLocation'
        | 'shipFrom'
        | 'shipTo'
        | 'pointOfOrderOrigin'
        | 'pointOfOrderAcceptance'
        | 'goodsPlaceOrServiceRendered'
        | 'import'
        | 'billTo'
    )[] = ['singleLocation', 'shipFrom', 'shipTo', 'pointOfOrderOrigin', 'pointOfOrderAcceptance', 'goodsPlaceOrServiceRendered', 'import', 'billTo'];

    const addresses = addressKeys.reduce<Partial<Record<(typeof addressKeys)[number], Address>>>((acc, key) => {
        // eslint-disable-next-line @nangohq/custom-integrations-linting/no-object-casting
        const address: Address = validatedInvoice.addresses[key] as Address;
        if (address && Object.values(address).some(Boolean)) {
            // eslint-disable-next-line @nangohq/custom-integrations-linting/no-value-modification
            acc[key] = {
                line1: address.line1 ?? '',
                city: address.city ?? '',
                region: address.region ?? '',
                country: address.country ?? '',
                postalCode: address.postalCode ?? ''
            };
        }
        return acc;
        // eslint-disable-next-line @nangohq/custom-integrations-linting/no-object-casting
    }, {} as AvalaraAddresses);

    const transactionInput: AvalaraTransactionInput = {
        lines,
        type: validatedInvoice.invoice.type === 'invoice' ? 'SalesInvoice' : 'ReturnInvoice',
        date: stringToDate(validatedInvoice.invoice.emissionDate),
        customerCode: validatedInvoice.externalCustomerId,
        purchaseOrderNo: validatedInvoice.invoice.invoiceNumber,
        addresses,
        commit,
        currencyCode: validatedInvoice.invoice.currency,
        description: validatedInvoice.invoice.invoiceNumber
    };

    if (input.companyCode) {
        transactionInput.companyCode = input.companyCode;
    }

    return transactionInput;
}
