import type { NangoSync, WildixPbxColleague, ProxyConfiguration } from '../../models';

export default async function fetchData(nango: NangoSync) {
    const MAX_IN_PAGE: number = 10;

    let page: number = 1;
    let allPages: number = 1;
    let start: number = 0;

    const connection = await nango.getConnection();

    // eslint-disable-next-line @nangohq/custom-integrations-linting/no-while-true
    while (true) {
        const payload: ProxyConfiguration = {
            baseUrlOverride: `https://${connection.connection_config['subdomain']}.wildixin.com`,
            // https://docs.wildix.com/wms/index.html#tag/Colleagues
            endpoint: '/api/v1/Colleagues/',
            params: {
                start,
                count: MAX_IN_PAGE
            },
            retries: 10
        };

        const { data } = await nango.get(payload);
        const { records, total } = data.result;

        allPages = Math.ceil(total / MAX_IN_PAGE);

        const mappedUsers: WildixPbxColleague[] = records.map((colleague: WildixPbxColleague) => ({
            id: colleague.id,
            name: colleague.name,
            extension: colleague.extension,
            email: colleague.email,
            mobilePhone: colleague.mobilePhone,
            licenseType: colleague.licenseType,
            language: colleague.language
        }));

        if (mappedUsers.length > 0) {
            await nango.batchSave<WildixPbxColleague>(mappedUsers, 'WildixPbxColleague');
            await nango.log(`Total colleagues ${total}. Page ${page}/${allPages}.`);
        }

        if (records.length === MAX_IN_PAGE) {
            page += 1;
            start = (page - 1) * MAX_IN_PAGE;
        } else {
            break;
        }
    }
}
