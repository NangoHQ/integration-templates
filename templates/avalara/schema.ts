import { z } from 'zod';
import { createTransactionSchema as createTransaction } from './schema.zod.js';

export const createTransactionSchema = createTransaction.extend({}).superRefine((data, ctx) => {
    // eslint-disable-next-line @nangohq/custom-integrations-linting/no-object-casting
    const addressKeys = ['singleLocation', 'shipFrom', 'shipTo', 'billTo'] as const;
    const addresses = data.addresses;

    // Check if at least one address is provided
    const hasAtLeastOneAddress = addressKeys.some((key) => {
        const address = addresses[key];
        return address && Object.keys(address).length > 0;
    });

    if (!hasAtLeastOneAddress) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'At least one address must be provided.',
            path: ['addresses']
        });
    }

    // Ensure only one address is provided if singleLocation is used
    const singleLocation = addresses.singleLocation;
    if (singleLocation) {
        const otherAddresses = addressKeys
            .filter((key) => key !== 'singleLocation')
            .some((key) => {
                const address = addresses[key];
                return address && Object.keys(address).length > 0;
            });

        if (otherAddresses) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'When using SingleAddress mode, you may only provide one address element.',
                path: ['addresses']
            });
        }
    }
});
