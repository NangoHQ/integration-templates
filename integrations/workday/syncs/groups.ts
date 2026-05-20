import { createSync } from 'nango';
import { z } from 'zod';
import soap from 'soap';
const WORKDAY_VERSION = '44.0';

const GroupSchema = z.object({
    id: z.string().describe('Organization_Reference_ID'),
    name: z.string(),
    type: z.string().optional().describe('Organization_Type_ID'),
    subtype: z.string().optional().describe('Organization_Subtype_ID'),
    description: z.string().optional(),
    inactive: z.boolean(),
    last_updated: z.string().optional().describe('ISO 8601 datetime of last update')
});

const GROUP_ORGANIZATION_TYPES = ['SUPERVISORY', 'SECURITY', 'MATRIX', 'COMPANY', 'COST_CENTER', 'CUSTOM_ORGANIZATION'];

type Connection = {
    credentials: {
        type?: string;
        username?: string;
        password?: string;
    };
    connection_config: Record<string, string | undefined>;
};

async function getSoapClient(type: 'Human_Resources' | 'Staffing', connection: Connection) {
    const { credentials, connection_config } = connection;

    if (credentials.type !== 'BASIC' || !credentials.username || !credentials.password || !connection_config['hostname'] || !connection_config['tenant']) {
        throw new Error('Invalid credentials: BASIC auth, username, password, hostname, and tenant are all required.');
    }

    const wsdlUrl = `https://community.workday.com/sites/default/files/file-hosting/productionapi/${type}/v${WORKDAY_VERSION}/${type}.wsdl`;
    const endpointUrl = `https://${connection_config['hostname']}/ccx/service/${connection_config['tenant']}/${type}/v${WORKDAY_VERSION}`;

    const client = await soap.createClientAsync(wsdlUrl, {});
    client.addHttpHeader('Accept-Encoding', 'gzip, deflate');
    client.setSecurity(new soap.WSSecurity(credentials.username, credentials.password));
    client.setEndpoint(endpointUrl);
    return client;
}

const findId = (ids: any, type: string): string | undefined => (Array.isArray(ids) ? ids : [ids]).find((r: any) => r?.attributes?.['wd:type'] === type)?.$value;

const sync = createSync({
    description: 'Sync Workday supervisory or security groups.',
    version: '2.0.0',
    frequency: 'every hour',
    autoStart: true,
    syncType: 'full',
    models: {
        Group: GroupSchema
    },
    endpoints: [{ method: 'POST', path: '/syncs/groups' }],

    exec: async (nango) => {
        const connection = await nango.getConnection();
        // getSoapClient throws on invalid credentials — do this before trackDeletesStart
        const client = await getSoapClient('Human_Resources', connection);

        // Blocker: Workday Get_Organizations does not support a modified_since filter.
        // Full refresh with deletion tracking is required.
        await nango.trackDeletesStart('Group');

        let page = 1;
        let hasMoreData = true;

        do {
            await nango.log(`Fetching page ${page}`);

            // https://community.workday.com/sites/default/files/file-hosting/productionapi/Human_Resources/v44.0/Get_Organizations.html
            const [res]: [any, string] = await client['Get_OrganizationsAsync']({
                Response_Filter: {
                    Page: page,
                    Count: 100
                }
            });

            const totalPages = res.Response_Results?.Total_Pages ?? 1;
            hasMoreData = page < totalPages;
            page += 1;

            const organizations = res.Response_Data?.Organization ?? [];
            const groups: z.infer<typeof GroupSchema>[] = [];

            for (const org of organizations) {
                const data = org.Organization_Data;
                if (!data) continue;

                const orgType = findId(data.Organization_Type_Reference?.ID, 'Organization_Type_ID');
                if (!orgType || !GROUP_ORGANIZATION_TYPES.includes(orgType)) continue;

                const id = findId(org.Organization_Reference?.ID, 'Organization_Reference_ID');
                if (!id) continue;

                groups.push({
                    id,
                    name: data.Name ?? '',
                    type: orgType,
                    ...(data.Organization_Subtype_Reference?.ID && {
                        subtype: findId(data.Organization_Subtype_Reference.ID, 'Organization_Subtype_ID')
                    }),
                    ...(data.Description && { description: data.Description }),
                    inactive: data.Inactive === '1' || data.Inactive === true,
                    ...(data.Last_Updated_DateTime && { last_updated: data.Last_Updated_DateTime })
                });
            }

            if (groups.length > 0) {
                await nango.batchSave(groups, 'Group');
            }
        } while (hasMoreData);

        await nango.trackDeletesEnd('Group');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
