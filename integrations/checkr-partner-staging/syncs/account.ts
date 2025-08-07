import type { NangoSync, CheckrPartnerStagingAccount, ProxyConfiguration } from '../../models.js';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const connection = await nango.getConnection();
    let access_token: string;
    if ('access_token' in connection.credentials) {
        access_token = connection.credentials.access_token;
    } else {
        throw new nango.ActionError({
            message: `access_token is missing`
        });
    }
    const config: ProxyConfiguration = {
        // https://docs.checkr.com/#operation/account
        endpoint: '/v1/account',
        headers: {
            Authorization: 'Basic ' + Buffer.from(access_token + ':').toString('base64')
        },
        retries: 10
    };

    const response = await nango.get(config);
    const mappedAccount = mapUser(response.data);

    await nango.batchSave([mappedAccount], 'CheckrPartnerStagingAccount');
}

function mapUser(account: any): CheckrPartnerStagingAccount {
    return {
        id: account.id,
        object: account.object,
        account_deauthorization: account.account_deauthorization,
        adverse_action_email: account.adverse_action_email,
        api_authorized: account.api_authorized,
        authorized: account.authorized,
        available_screenings: account.available_screenings,
        billing_email: account.billing_email,
        company: account.company,
        compliance_contact_email: account.compliance_contact_email,
        created_at: account.created_at,
        default_compliance_city: account.default_compliance_city,
        default_compliance_state: account.default_compliance_state,
        geos_required: account.geos_required,
        name: account.name,
        purpose: account.purpose,
        segmentation_enabled: account.segmentation_enabled,
        support_email: account.support_email,
        support_phone: account.support_phone,
        technical_contact_email: account.technical_contact_email,
        uri: account.uri,
        uri_name: account.uri_name
    };
}
