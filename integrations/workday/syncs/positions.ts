import { createSync } from 'nango';
import { z } from 'zod';
import soap from 'soap';
const WORKDAY_VERSION = '44.0';

const PositionSchema = z.object({
    id: z.string().describe('Position ID (e.g., "POS-001")'),
    name: z.string().optional().describe('Position name'),
    position_code: z.string().optional().describe('Position code'),
    effective_date: z.string().optional().describe('Effective date of the position'),
    inactive: z.boolean().optional().describe('Whether the position is inactive'),
    job_profile_id: z.string().optional().describe('Job profile reference ID'),
    job_profile_name: z.string().optional().describe('Job profile name'),
    location_id: z.string().optional().describe('Location reference ID'),
    location_name: z.string().optional().describe('Location name'),
    supervisory_org_id: z.string().optional().describe('Supervisory organization reference ID'),
    supervisory_org_name: z.string().optional().describe('Supervisory organization name'),
    worker_id: z.string().optional().describe('Assigned worker ID'),
    worker_name: z.string().optional().describe('Assigned worker name'),
    full_time_equivalent: z.string().optional().describe('Full-time equivalent percentage'),
    scheduled_weekly_hours: z.string().optional().describe('Scheduled weekly hours'),
    pay_rate: z.string().optional().describe('Pay rate'),
    currency: z.string().optional().describe('Currency code'),
    compensation_frequency: z.string().optional().describe('Compensation frequency')
});

async function getSoapClient(type: 'Human_Resources' | 'Staffing', connection: any) {
    const { credentials, connection_config } = connection;

    if (
        !credentials ||
        credentials.type !== 'BASIC' ||
        !credentials.username ||
        !credentials.password ||
        !connection_config?.['hostname'] ||
        !connection_config?.['tenant']
    ) {
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
    description: 'Sync positions from Workday.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [{ method: 'GET', path: '/syncs/positions' }],
    models: {
        Position: PositionSchema
    },

    exec: async (nango) => {
        const connection = await nango.getConnection();
        // getSoapClient throws on invalid credentials — do this before trackDeletesStart
        const client = await getSoapClient('Staffing', connection);

        // Blocker: Workday Staffing API Get_Positions does not support changed-since filtering.
        await nango.trackDeletesStart('Position');

        let page = 1;
        let hasMoreData = true;

        do {
            await nango.log(`Fetching page ${page}`);

            // https://community.workday.com/sites/default/files/file-hosting/productionapi/Staffing/v44.0/Get_Positions.html
            const [res]: [any, string] = await client['Get_PositionsAsync']({
                Response_Filter: {
                    Page: page,
                    Count: 100
                }
            });

            const totalPages = res.Response_Results?.Total_Pages ?? 1;
            hasMoreData = page < totalPages;
            page += 1;

            const positions = res.Response_Data?.Position ?? [];
            const mapped: z.infer<typeof PositionSchema>[] = [];

            for (const pos of positions) {
                const data = pos.Position_Data;
                mapped.push({
                    id: findId(pos.Position_Reference?.ID, 'Position_ID') ?? '',
                    name: data?.Position_Name ?? undefined,
                    position_code: findId(pos.Position_Reference?.ID, 'Position_Reference_ID') ?? undefined,
                    effective_date: data?.Effective_Date ?? undefined,
                    inactive: data?.Inactive === '1' || data?.Inactive === true,
                    job_profile_id:
                        findId(data?.Job_Profile_Reference?.ID, 'Job_Profile_ID') ??
                        findId(data?.Job_Profile_Reference?.ID, 'Job_Profile_Reference_ID') ??
                        undefined,
                    job_profile_name: data?.Job_Profile_Summary_Data?.Job_Profile_Name ?? undefined,
                    location_id:
                        findId(data?.Location_Reference?.ID, 'Location_ID') ?? findId(data?.Location_Reference?.ID, 'Location_Reference_ID') ?? undefined,
                    location_name: data?.Location_Summary_Data?.Name ?? undefined,
                    supervisory_org_id:
                        findId(data?.Supervisory_Organization_Reference?.ID, 'Organization_Reference_ID') ??
                        findId(data?.Supervisory_Organization_Reference?.ID, 'Organization_ID') ??
                        undefined,
                    supervisory_org_name: data?.Supervisory_Organization_Data?.Organization_Name ?? undefined,
                    worker_id: findId(data?.Worker_Reference?.ID, 'Employee_ID') ?? findId(data?.Worker_Reference?.ID, 'Contingent_Worker_ID') ?? undefined,
                    worker_name: data?.Worker_Summary_Data?.Name ?? undefined,
                    full_time_equivalent: data?.Full_Time_Equivalent ?? undefined,
                    scheduled_weekly_hours: data?.Scheduled_Weekly_Hours ?? undefined,
                    pay_rate: data?.Pay_Rate_Data?.Pay_Rate ?? undefined,
                    currency: findId(data?.Pay_Rate_Data?.Currency_Reference?.ID, 'Currency_ID') ?? undefined,
                    compensation_frequency: findId(data?.Pay_Rate_Data?.Frequency_Reference?.ID, 'Frequency_ID') ?? undefined
                });
            }

            if (mapped.length > 0) {
                await nango.batchSave(mapped, 'Position');
            }
        } while (hasMoreData);

        await nango.trackDeletesEnd('Position');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
