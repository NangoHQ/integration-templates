import { z } from 'zod';
import { createAction } from 'nango';
import soap from 'soap';
import { security } from 'soap';

const WORKDAY_VERSION = '44.0';

interface WorkdayConnection {
    credentials: {
        type?: string;
        username?: string;
        password?: string;
    };
    connection_config: Record<string, unknown>;
}

async function getSoapClient(type: 'Human_Resources' | 'Staffing', connection: WorkdayConnection) {
    const { credentials, connection_config } = connection;

    if (credentials.type !== 'BASIC' || !credentials.username || !credentials.password || !connection_config['hostname'] || !connection_config['tenant']) {
        throw new Error('Invalid credentials: BASIC auth, username, password, hostname, and tenant are all required.');
    }

    const wsdlUrl = `https://community.workday.com/sites/default/files/file-hosting/productionapi/${type}/v${WORKDAY_VERSION}/${type}.wsdl`;
    const endpointUrl = `https://${connection_config['hostname']}/ccx/service/${connection_config['tenant']}/${type}/v${WORKDAY_VERSION}`;

    const client = await soap.createClientAsync(wsdlUrl, {});
    client.addHttpHeader('Accept-Encoding', 'gzip, deflate');
    client.setSecurity(new security.WSSecurity(credentials.username, credentials.password));
    client.setEndpoint(endpointUrl);
    return client;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function getString(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined;
}

function getNumber(value: unknown): number | undefined {
    return typeof value === 'number' ? value : undefined;
}

const findId = (ids: unknown, type: string): string | undefined => {
    const arr = Array.isArray(ids) ? ids : [ids];
    const found = arr.find((r: unknown) => {
        if (!isRecord(r)) {
            return false;
        }
        const attrs = r['attributes'];
        if (!isRecord(attrs)) {
            return false;
        }
        return attrs['wd:type'] === type;
    });
    if (isRecord(found)) {
        const val = found['$value'];
        if (typeof val === 'string') {
            return val;
        }
    }
    return undefined;
};

const PositionSchema = z.object({
    id: z.string(),
    title: z.string(),
    job_profile_id: z.string().optional(),
    job_profile_name: z.string().optional(),
    location_id: z.string().optional(),
    location_name: z.string().optional(),
    worker_id: z.string().optional(),
    worker_name: z.string().optional(),
    availability_date: z.string().optional(),
    inactive: z.boolean(),
    organization_id: z.string().optional(),
    organization_name: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(PositionSchema)
});

const action = createAction({
    description: 'List positions from Workday.',
    version: '1.0.0',
    endpoint: { method: 'POST', path: '/actions/list-positions', group: 'Positions' },
    input: z.object({}),
    output: OutputSchema,

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const client = await getSoapClient('Staffing', connection);

        const positions: z.infer<typeof PositionSchema>[] = [];
        let page = 1;
        let hasMoreData = true;

        do {
            // https://community.workday.com/sites/default/files/file-hosting/productionapi/Staffing/v44.0/Get_Positions.html
            const tuple = await client['Get_PositionsAsync']({
                Response_Filter: {
                    Page: page,
                    Count: 100
                }
            });
            const res = tuple[0];

            const responseResults = isRecord(res) ? res['Response_Results'] : undefined;
            const responseData = isRecord(res) ? res['Response_Data'] : undefined;

            const pageResults = isRecord(responseResults) ? getNumber(responseResults['Page']) : undefined;
            const totalPages = isRecord(responseResults) ? getNumber(responseResults['Total_Pages']) : undefined;

            const rawPositions = isRecord(responseData) ? responseData['Position'] : undefined;
            const positionList = Array.isArray(rawPositions) ? rawPositions : [];

            for (const pos of positionList) {
                if (!isRecord(pos)) {
                    continue;
                }
                const data = isRecord(pos['Position_Data']) ? pos['Position_Data'] : undefined;

                const jobProfileRef = isRecord(data?.['Job_Profile_Reference']) ? data['Job_Profile_Reference'] : undefined;
                const locationRef = isRecord(data?.['Location_Reference']) ? data['Location_Reference'] : undefined;
                const workerRef = isRecord(data?.['Worker_Reference']) ? data['Worker_Reference'] : undefined;

                const orgRefs = data?.['Organization_Reference'];
                const firstOrgRef = Array.isArray(orgRefs) ? orgRefs[0] : orgRefs;
                const orgRef = isRecord(firstOrgRef) ? firstOrgRef : undefined;

                const positionId = findId(pos['Position_Reference'], 'Position_ID') ?? getString(data?.['Position_ID']) ?? '';
                const title = getString(data?.['Position_Title']) ?? '';
                const availabilityDate = getString(data?.['Availability_Date']);
                const inactive = data?.['Inactive'] === '1' || data?.['Inactive'] === true;

                positions.push({
                    id: positionId,
                    title,
                    job_profile_id: findId(jobProfileRef?.['ID'], 'Job_Profile_ID'),
                    job_profile_name: getString(jobProfileRef?.['Descriptor']),
                    location_id: findId(locationRef?.['ID'], 'Location_ID'),
                    location_name: getString(locationRef?.['Descriptor']),
                    worker_id: findId(workerRef?.['ID'], 'Employee_ID') ?? findId(workerRef?.['ID'], 'Contingent_Worker_ID'),
                    worker_name: getString(workerRef?.['Descriptor']),
                    availability_date: availabilityDate,
                    inactive,
                    organization_id: findId(orgRef?.['ID'], 'Organization_Reference_ID'),
                    organization_name: getString(orgRef?.['Descriptor'])
                });
            }

            const currentPage = pageResults ?? 0;
            const total = totalPages ?? 0;
            hasMoreData = currentPage < total;
            page += 1;
        } while (hasMoreData);

        return { items: positions };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
