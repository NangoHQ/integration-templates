import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderMandateSchema = z.object({
    status: z.string().optional(),
    early_execution_date_permitted: z.boolean().optional(),
    active_billing_subscription: z.boolean().optional(),
    signed_at: z.string().nullable().optional(),
    created_at: z.string().optional(),
    pdf_url: z.string().nullable().optional(),
    customer: z
        .object({
            id: z.number(),
            url: z.string()
        })
        .nullable()
        .optional()
});

const ProAccountMandateSchema = z.object({
    id: z.string(),
    status: z.string().optional(),
    early_execution_date_permitted: z.boolean().optional(),
    active_billing_subscription: z.boolean().optional(),
    signed_at: z.string().optional(),
    created_at: z.string().optional(),
    pdf_url: z.string().optional(),
    customer_id: z.string().optional()
});

function isNoProAccountError(error: unknown): boolean {
    if (error instanceof Error) {
        if (error.message.includes('No Pro Account associated with the company')) {
            return true;
        }
    }

    if (error !== null && typeof error === 'object') {
        if ('response' in error) {
            const response = error.response;
            if (response !== null && typeof response === 'object' && 'data' in response) {
                const data = response.data;
                if (data !== null && typeof data === 'object' && 'error' in data) {
                    const errorMessage = data.error;
                    return typeof errorMessage === 'string' && errorMessage.includes('No Pro Account associated with the company');
                }
            }
        }
    }

    return false;
}

const sync = createSync({
    description: 'Sync Pro Account payment mandates',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    scopes: ['customer_mandates:readonly'],
    models: {
        ProAccountMandate: ProAccountMandateSchema
    },

    exec: async (nango) => {
        // Blocker: the Pro Account mandates endpoint does not expose a
        // changed-since filter, changelog feed, or deleted-record endpoint.
        // We therefore perform a full crawl with full-refresh delete tracking.
        await nango.trackDeletesStart('ProAccountMandate');

        const proxyConfig: ProxyConfiguration = {
            // https://pennylane.readme.io/reference/getproaccountmandates
            endpoint: '/api/external/v2/pro_account/mandates',
            retries: 3,
            paginate: {
                type: 'cursor',
                cursor_name_in_request: 'cursor',
                cursor_path_in_response: 'next_cursor',
                response_path: 'items',
                limit_name_in_request: 'limit',
                limit: 100
            }
        };

        // @allowTryCatch: A company without a configured Pro Account returns 404
        // "No Pro Account associated with the company". Treating this as a valid
        // company state that should delete any previously synced mandates.
        try {
            for await (const page of nango.paginate(proxyConfig)) {
                const mandates: Array<z.infer<typeof ProAccountMandateSchema>> = [];
                for (const record of page) {
                    const parsed = ProviderMandateSchema.safeParse(record);
                    if (!parsed.success) {
                        throw new Error(`Failed to parse mandate: ${parsed.error.message}`);
                    }
                    // A mandate has no identifier of its own; it is uniquely keyed by its customer.
                    if (parsed.data.customer == null) {
                        continue;
                    }
                    mandates.push({
                        id: String(parsed.data.customer.id),
                        ...(parsed.data.status != null && { status: parsed.data.status }),
                        ...(parsed.data.early_execution_date_permitted != null && {
                            early_execution_date_permitted: parsed.data.early_execution_date_permitted
                        }),
                        ...(parsed.data.active_billing_subscription != null && {
                            active_billing_subscription: parsed.data.active_billing_subscription
                        }),
                        ...(parsed.data.signed_at != null && { signed_at: parsed.data.signed_at }),
                        ...(parsed.data.created_at != null && { created_at: parsed.data.created_at }),
                        ...(parsed.data.pdf_url != null && { pdf_url: parsed.data.pdf_url }),
                        customer_id: String(parsed.data.customer.id)
                    });
                }

                if (mandates.length > 0) {
                    await nango.batchSave(mandates, 'ProAccountMandate');
                }
            }
        } catch (error) {
            if (!isNoProAccountError(error)) {
                throw error;
            }
        }

        await nango.trackDeletesEnd('ProAccountMandate');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
