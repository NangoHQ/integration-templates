import type { NangoSync, PennylaneIndividualCustomer, PennylaneSyncCustomer, ProxyConfiguration } from '../../models.js';

export default async function fetchData(nango: NangoSync) {
    const config: ProxyConfiguration = {
        // https://pennylane.readme.io/reference/customers-get-1
        endpoint: `/api/external/v1/customers`,
        retries: 10,
        paginate: {
            type: 'offset',
            offset_name_in_request: 'page',
            response_path: 'customers'
        }
    };

    if (nango.lastSyncDate) {
        config.params = {
            filter: JSON.stringify([
                {
                    field: 'updated_at',
                    operator: 'gteq',
                    value: nango.lastSyncDate.toISOString()
                }
            ])
        };
    }

    for await (const response of nango.paginate<PennylaneIndividualCustomer>(config)) {
        const customers = response.map((pennylaneCustomer) => {
            const cust: PennylaneSyncCustomer = {
                id: pennylaneCustomer.source_id!,
                address: pennylaneCustomer?.address ?? '',
                billing_iban: pennylaneCustomer.billing_iban ?? '',
                city: pennylaneCustomer?.city ?? '',
                country_alpha2: pennylaneCustomer?.country_alpha2 ?? '',
                emails: pennylaneCustomer.emails ?? [],
                first_name: pennylaneCustomer?.first_name ?? '',
                last_name: pennylaneCustomer.last_name ?? '',
                source_id: pennylaneCustomer.source_id ?? '',
                phone: pennylaneCustomer.phone ?? '',
                gender: pennylaneCustomer?.gender ?? '',
                notes: pennylaneCustomer.notes ?? '',
                postal_code: pennylaneCustomer?.postal_code ?? '',
                delivery_postal_code: pennylaneCustomer.postal_code ?? '',
                payment_conditions: pennylaneCustomer.payment_conditions ?? '',
                reference: pennylaneCustomer.reference ?? '',
                vat_number: pennylaneCustomer.vat_number ?? null
            };
            return cust;
        });
        await nango.batchSave<PennylaneSyncCustomer>(customers, 'PennylaneSyncCustomer');
    }
}
