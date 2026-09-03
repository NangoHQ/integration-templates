import { createSync } from 'nango';
import { getDeveloperToken } from '../helpers/get-developer-token.js';
import { z } from 'zod';

const CustomerSchema = z.object({
    id: z.string(),
    resourceName: z.string(),
    descriptiveName: z.string().optional(),
    manager: z.boolean().optional(),
    testAccount: z.boolean().optional(),
    status: z.string().optional()
});

const ListAccessibleCustomersResponseSchema = z.object({
    resourceNames: z.array(z.string())
});

const SearchStreamErrorSchema = z.object({
    error: z.object({
        code: z.number(),
        message: z.string(),
        details: z
            .array(
                z.object({
                    '@type': z.string().optional(),
                    errors: z
                        .array(
                            z.object({
                                errorCode: z
                                    .object({
                                        authorizationError: z.string().optional()
                                    })
                                    .optional(),
                                message: z.string().optional()
                            })
                        )
                        .optional(),
                    requestId: z.string().optional()
                })
            )
            .optional()
    })
});

const SearchStreamResultSchema = z.object({
    results: z
        .array(
            z.object({
                customer: z.object({
                    resourceName: z.string(),
                    id: z.string(),
                    descriptiveName: z.string().optional(),
                    manager: z.boolean().optional(),
                    testAccount: z.boolean().optional(),
                    status: z.string().optional()
                })
            })
        )
        .optional(),
    fieldMask: z.string().optional(),
    requestId: z.string().optional(),
    queryResourceConsumption: z.string().optional()
});

const SearchStreamResponseSchema = z.array(z.union([SearchStreamResultSchema, SearchStreamErrorSchema]));
const ResourceNamesSchema = z.array(z.string().min(1));

const CheckpointSchema = z.object({
    resourceNamesJson: z.string(),
    nextIndex: z.number().int().min(0),
    anyAccountSkipped: z.boolean()
});

const sync = createSync({
    description: 'Sync directly accessible Google Ads customer accounts',
    version: '1.0.3',
    frequency: 'every hour',
    autoStart: false,
    checkpoint: CheckpointSchema,
    models: {
        Customer: CustomerSchema
    },

    exec: async (nango) => {
        const developerToken = await getDeveloperToken(nango);
        if (!developerToken) {
            throw new Error('developer_token is required in connection config');
        }

        const rawCheckpoint = await nango.getCheckpoint();
        const checkpointResult = CheckpointSchema.safeParse(rawCheckpoint);
        if (rawCheckpoint != null && !checkpointResult.success) {
            throw new Error('Invalid checkpoint: ' + checkpointResult.error.message);
        }
        const checkpoint = checkpointResult.success ? checkpointResult.data : undefined;

        await nango.trackDeletesStart('Customer');

        let resourceNames: string[];
        let nextIndex: number;
        let anyAccountSkipped = false;

        if (checkpoint) {
            resourceNames = ResourceNamesSchema.parse(JSON.parse(checkpoint.resourceNamesJson));
            nextIndex = checkpoint.nextIndex;
            anyAccountSkipped = checkpoint.anyAccountSkipped;
        } else {
            // https://developers.google.com/google-ads/api/docs/account-management/listing-accounts
            const listResponse = await nango.get({
                endpoint: 'v25/customers:listAccessibleCustomers',
                headers: {
                    'developer-token': developerToken
                },
                retries: 3
            });

            const listData = ListAccessibleCustomersResponseSchema.parse(listResponse.data);
            resourceNames = listData.resourceNames;
            nextIndex = 0;
        }

        if (resourceNames.length > 0) {
            for (let i = nextIndex; i < resourceNames.length; i++) {
                const resourceName = resourceNames[i];
                if (!resourceName) {
                    throw new Error(`Missing customer resource name at index ${i}`);
                }
                const customerId = resourceName.replace('customers/', '');

                // https://developers.google.com/google-ads/api/docs/reporting/streaming
                let searchResponse;
                // @allowTryCatch: a listed account can still be inaccessible to the
                // developer token or require manager context that this endpoint does
                // not provide. Skip it without finalizing deletion tracking.
                try {
                    searchResponse = await nango.post({
                        endpoint: `v25/customers/${encodeURIComponent(customerId)}/googleAds:searchStream`,
                        data: {
                            query: 'SELECT customer.id, customer.descriptive_name, customer.manager, customer.test_account, customer.status FROM customer'
                        },
                        headers: {
                            'developer-token': developerToken
                        },
                        retries: 3
                    });
                } catch (err) {
                    let isSkippableAuthorizationError = false;
                    if (
                        err &&
                        typeof err === 'object' &&
                        'response' in err &&
                        err.response &&
                        typeof err.response === 'object' &&
                        'status' in err.response &&
                        err.response.status === 403 &&
                        'data' in err.response
                    ) {
                        const errorPayload = JSON.stringify(err.response.data);
                        isSkippableAuthorizationError =
                            errorPayload.includes('DEVELOPER_TOKEN_NOT_APPROVED') || errorPayload.includes('USER_PERMISSION_DENIED');
                    }
                    if (isSkippableAuthorizationError) {
                        anyAccountSkipped = true;
                        await nango.saveCheckpoint({ resourceNamesJson: JSON.stringify(resourceNames), nextIndex: i + 1, anyAccountSkipped });
                        continue;
                    }
                    throw err;
                }

                const searchData = SearchStreamResponseSchema.parse(searchResponse.data);

                const customersToSave = [];
                for (const streamResult of searchData) {
                    if ('error' in streamResult) {
                        throw new Error(`Google Ads API error for customer ${customerId}: ${streamResult.error.message}`);
                    }

                    const firstResult = streamResult.results?.[0];
                    if (!firstResult) {
                        continue;
                    }

                    const customerRow = firstResult.customer;
                    customersToSave.push({
                        id: customerRow.id,
                        resourceName: customerRow.resourceName,
                        ...(customerRow.descriptiveName !== undefined && { descriptiveName: customerRow.descriptiveName }),
                        ...(customerRow.manager !== undefined && { manager: customerRow.manager }),
                        ...(customerRow.testAccount !== undefined && { testAccount: customerRow.testAccount }),
                        ...(customerRow.status !== undefined && { status: customerRow.status })
                    });
                }

                if (customersToSave.length > 0) {
                    await nango.batchSave(customersToSave, 'Customer');
                }

                await nango.saveCheckpoint({ resourceNamesJson: JSON.stringify(resourceNames), nextIndex: i + 1, anyAccountSkipped });
            }
        }

        await nango.clearCheckpoint();

        // If any account was skipped (test-only developer token cannot access it), this run only
        // observed a partial view of accessible customers. Finalizing deletion tracking here would
        // falsely mark previously-synced, unobserved customers as deleted, so skip finalization and
        // let a future run with full access reconcile deletes instead.
        if (!anyAccountSkipped) {
            await nango.trackDeletesEnd('Customer');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
