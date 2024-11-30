import type { CreateSupplier, NangoSync, PennylaneSyncSupplier, ProxyConfiguration } from '../../models.js';

export default async function fetchData(nango: NangoSync) {
    const config: ProxyConfiguration = {
        // https://pennylane.readme.io/reference/suppliers-post
        endpoint: `/api/external/v1/suppliers`,
        retries: 10,
        paginate: {
            type: 'offset',
            offset_name_in_request: 'page',
            response_path: 'suppliers'
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

    for await (const response of nango.paginate<CreateSupplier>(config)) {
        const suppliers = response.map((supplier) => {
            const supp: PennylaneSyncSupplier = {
                id: supplier.source_id!,
                address: supplier?.address ?? '',
                name: supplier.name ?? '',
                city: supplier?.city ?? '',
                country_alpha2: supplier?.country_alpha2 ?? '',
                emails: supplier.emails ?? [],
                iban: supplier.iban ?? '',
                source_id: supplier.source_id ?? '',
                phone: supplier.phone ?? '',
                notes: supplier.notes ?? '',
                postal_code: supplier?.postal_code ?? '',
                recipient: supplier.recipient ?? '',
                reg_no: supplier.reg_no ?? '',
                payment_conditions: supplier.payment_conditions ?? '',
                reference: supplier.reference ?? '',
                vat_number: supplier.vat_number ?? ''
            };
            return supp;
        });
        await nango.batchSave<PennylaneSyncSupplier>(suppliers, 'PennylaneSyncSupplier');
    }
}
