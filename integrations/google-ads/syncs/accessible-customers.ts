import { createSync } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    developerToken: z.string().describe('Google Ads developer token. Example: "YOUR_DEVELOPER_TOKEN"')
});

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

const sync = createSync({
    description: 'Sync directly accessible Google Ads customer accounts',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: false,
    metadata: MetadataSchema,
    models: {
        Customer: CustomerSchema
    },

    exec: async (nango) => {
        const rawMetadata = await nango.getMetadata();
        const metadataResult = MetadataSchema.safeParse(rawMetadata);
        if (!metadataResult.success) {
            throw new Error('Invalid metadata: ' + metadataResult.error.message);
        }
        const metadata = metadataResult.data;

        // https://developers.google.com/google-ads/api/docs/account-management/listing-accounts
        const listResponse = await nango.get({
            endpoint: 'v21/customers:listAccessibleCustomers',
            headers: {
                'developer-token': metadata.developerToken
            },
            retries: 3
        });

        const listData = ListAccessibleCustomersResponseSchema.parse(listResponse.data);
        const resourceNames = listData.resourceNames;

        await nango.trackDeletesStart('Customer');

        const customers = [];

        for (const resourceName of resourceNames) {
            const customerId = resourceName.replace('customers/', '');

            // https://developers.google.com/google-ads/api/docs/reporting/streaming
            let searchResponse;
            // @allowTryCatch: test-only developer tokens cannot access non-test accounts.
            // Skip these accounts gracefully; in production with an approved token this branch is unreachable.
            try {
                searchResponse = await nango.post({
                    endpoint: `v21/customers/${encodeURIComponent(customerId)}/googleAds:searchStream`,
                    data: {
                        query: 'SELECT customer.id, customer.descriptive_name, customer.manager, customer.test_account, customer.status FROM customer'
                    },
                    headers: {
                        'developer-token': metadata.developerToken
                    },
                    retries: 3
                });
            } catch (err) {
                const isDeveloperTokenError =
                    err &&
                    typeof err === 'object' &&
                    'response' in err &&
                    err.response &&
                    typeof err.response === 'object' &&
                    'status' in err.response &&
                    err.response.status === 403 &&
                    'data' in err.response &&
                    JSON.stringify(err.response.data).includes('DEVELOPER_TOKEN_NOT_APPROVED');
                if (isDeveloperTokenError) {
                    continue;
                }
                throw err;
            }

            const searchData = SearchStreamResponseSchema.parse(searchResponse.data);

            for (const streamResult of searchData) {
                if ('error' in streamResult) {
                    throw new Error(`Google Ads API error for customer ${customerId}: ${streamResult.error.message}`);
                }

                const firstResult = streamResult.results?.[0];
                if (!firstResult) {
                    continue;
                }

                const customerRow = firstResult.customer;
                customers.push({
                    id: customerRow.id,
                    resourceName: customerRow.resourceName,
                    ...(customerRow.descriptiveName !== undefined && { descriptiveName: customerRow.descriptiveName }),
                    ...(customerRow.manager !== undefined && { manager: customerRow.manager }),
                    ...(customerRow.testAccount !== undefined && { testAccount: customerRow.testAccount }),
                    ...(customerRow.status !== undefined && { status: customerRow.status })
                });
            }
        }

        if (customers.length > 0) {
            await nango.batchSave(customers, 'Customer');
        }

        await nango.trackDeletesEnd('Customer');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
