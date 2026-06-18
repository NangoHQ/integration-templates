import { z } from 'zod';
import { createAction } from 'nango';
import soap from 'soap';

const WORKDAY_VERSION = '44.0';

interface Connection {
    credentials: {
        type?: string;
        username?: string;
        password?: string;
    };
    connection_config: Record<string, string | undefined>;
}

async function getSoapClient(type: 'Human_Resources' | 'Staffing', connection: Connection) {
    const { credentials, connection_config } = connection;

    if (
        !credentials ||
        credentials.type !== 'BASIC' ||
        !credentials.username ||
        !credentials.password ||
        !connection_config['hostname'] ||
        !connection_config['tenant']
    ) {
        throw new Error('Invalid credentials: BASIC auth, username, password, hostname, and tenant are all required.');
    }

    // WSDL from Workday's community site defines all operations and types
    const wsdlUrl = `https://community.workday.com/sites/default/files/file-hosting/productionapi/${type}/v${WORKDAY_VERSION}/${type}.wsdl`;
    // Actual requests go to the tenant's host, not the WSDL host
    const endpointUrl = `https://${connection_config['hostname']}/ccx/service/${connection_config['tenant']}/${type}/v${WORKDAY_VERSION}`;

    const client = await soap.createClientAsync(wsdlUrl, {});
    client.addHttpHeader('Accept-Encoding', 'gzip, deflate'); // required — omitting causes failures on some queries
    client.setSecurity(new soap.WSSecurity(credentials.username, credentials.password));
    client.setEndpoint(endpointUrl); // override WSDL default endpoint with the actual tenant URL
    return client;
}

const findId = (ids: any, type: string): string | undefined => (Array.isArray(ids) ? ids : [ids]).find((r: any) => r?.attributes?.['wd:type'] === type)?.$value;

// Safely unwrap a potentially array-wrapped value
const unwrap = <T>(value: T | T[] | undefined): T | undefined => {
    if (value === undefined || value === null) return undefined;
    if (Array.isArray(value)) return value[0];
    return value;
};

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number). Omit for the first page.')
});

const WorkerSchema = z.object({
    id: z.string(),
    employee_id: z.string().optional(),
    contingent_worker_id: z.string().optional(),
    user_id: z.string().optional(),
    name: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    hire_date: z.string().optional(),
    termination_date: z.string().optional(),
    worker_type: z.string().optional(),
    employment_status: z.string().optional(),
    business_title: z.string().optional(),
    job_profile: z.string().optional(),
    department: z.string().optional(),
    location: z.string().optional(),
    manager_id: z.string().optional(),
    is_active: z.boolean().optional()
});

const OutputSchema = z.object({
    items: z.array(WorkerSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List workers from Workday.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();

        // https://community.workday.com/sites/default/files/file-hosting/productionapi/index.html
        const client = await getSoapClient('Human_Resources', connection);

        let page = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (isNaN(page) || page < 1) {
            page = 1;
        }

        const items: z.infer<typeof WorkerSchema>[] = [];

        // https://community.workday.com/sites/default/files/file-hosting/productionapi/Human_Resources/v44.0/Get_Workers.html
        const [res]: [any, string] = await client['Get_WorkersAsync']({
            Response_Filter: {
                Page: page,
                Count: 100
            },
            Response_Group: {
                Include_Reference: true,
                Include_Personal_Information: true,
                Include_Employment_Information: true
            }
        });

        const rawWorkers = res?.Response_Data?.Worker;
        const workers = Array.isArray(rawWorkers) ? rawWorkers : rawWorkers ? [rawWorkers] : [];
        const totalPages = res?.Response_Results?.Total_Pages ?? 1;

        for (const worker of workers) {
            const workerData = worker?.Worker_Data;
            if (!workerData) {
                continue;
            }

            const personalData = workerData?.Personal_Data;
            const employmentData = workerData?.Employment_Data;

            // Extract ID - try Worker_Reference first, then fall back to Universal_ID or Worker_ID from Worker_Data
            let workerId = findId(worker.Worker_Reference?.ID, 'WID');
            if (!workerId) {
                workerId = workerData.Universal_ID || workerData.Worker_ID;
            }
            if (!workerId) {
                continue;
            }

            // Extract name - handle potentially array-wrapped intermediate nodes
            const nameData = unwrap(personalData?.Name_Data);
            const legalNameData = unwrap(nameData?.Legal_Name_Data);
            const nameDetailData = unwrap(legalNameData?.Name_Detail_Data);
            const preferredNameData = unwrap(nameData?.Preferred_Name_Data);
            const preferredDetailData = unwrap(preferredNameData?.Name_Detail_Data);

            const workerName =
                nameDetailData?.Full_Name ||
                preferredDetailData?.Full_Name ||
                worker.Worker_Descriptor || // Fallback to descriptor
                undefined;

            // Extract primary email
            const contactData = personalData?.Contact_Data;
            const emailAddresses = contactData?.Email_Address_Data;
            let primaryEmail: string | undefined;
            if (Array.isArray(emailAddresses)) {
                const primary = emailAddresses.find((e: any) => e?.Primary === '1' || e?.Primary === true || e?._Primary === '1');
                primaryEmail = primary?.Email_Address;
            } else if (emailAddresses?.Email_Address) {
                primaryEmail = emailAddresses.Email_Address;
            }

            // Extract primary phone
            const phoneData = contactData?.Phone_Data;
            let primaryPhone: string | undefined;
            if (Array.isArray(phoneData)) {
                const primary = phoneData.find((p: any) => p?.Primary === '1' || p?.Primary === true || p?._Primary === '1');
                primaryPhone = primary?.Formatted_Phone_Number || primary?.Phone_Number;
            } else if (phoneData?.Formatted_Phone_Number || phoneData?.Phone_Number) {
                primaryPhone = phoneData.Formatted_Phone_Number || phoneData.Phone_Number;
            }

            // Extract current employment info - try both direct and wrapped paths
            const workerStatuses = employmentData?.Worker_Status_Data;
            const currentStatus = Array.isArray(workerStatuses) ? workerStatuses[0] : workerStatuses;

            // Extract position data - try both direct Position_Data and wrapped under Worker_Job_Data
            let positionData = employmentData?.Position_Data;
            if (!positionData && employmentData?.Worker_Job_Data) {
                const jobData = Array.isArray(employmentData.Worker_Job_Data) ? employmentData.Worker_Job_Data[0] : employmentData.Worker_Job_Data;
                positionData = jobData?.Position_Data;
            }
            const currentPosition = Array.isArray(positionData) ? positionData[0] : positionData;

            // Extract manager
            let managerId: string | undefined;
            if (currentPosition?.Manager_Reference) {
                managerId = findId(currentPosition.Manager_Reference.ID, 'Employee_ID') || findId(currentPosition.Manager_Reference.ID, 'Contingent_Worker_ID');
            }

            // Extract employment status - try multiple field names
            const employmentStatus = currentStatus?.Employment_Status || currentStatus?.Employment_Status_Name;

            // Build worker object, filtering out undefined values
            const rawWorker: Record<string, unknown> = {
                id: workerId,
                employee_id: findId(worker.Worker_Reference?.ID, 'Employee_ID') || workerData.Employee_ID,
                contingent_worker_id: findId(worker.Worker_Reference?.ID, 'Contingent_Worker_ID') || workerData.Contingent_Worker_ID,
                user_id: workerData.User_ID,
                name: workerName,
                email: primaryEmail,
                phone: primaryPhone,
                hire_date: currentStatus?.Hire_Date ? new Date(currentStatus.Hire_Date).toISOString() : undefined,
                termination_date: currentStatus?.Termination_Date ? new Date(currentStatus.Termination_Date).toISOString() : undefined,
                worker_type: findId(currentPosition?.Worker_Type_Reference?.ID, 'Worker_Type_ID'),
                employment_status: employmentStatus,
                business_title: currentPosition?.Business_Title,
                job_profile: findId(currentPosition?.Job_Profile_Reference?.ID, 'Job_Profile_ID'),
                department: findId(
                    currentPosition?.Organization_Data?.find((o: any) => findId(o.Organization_Type_Reference?.ID, 'Organization_Type_ID') === 'DEPARTMENT')
                        ?.Organization_Reference?.ID,
                    'Organization_Reference_ID'
                ),
                location: findId(currentPosition?.Location_Reference?.ID, 'Location_ID'),
                manager_id: managerId,
                is_active: currentStatus?.Active !== '0' && currentStatus?.Active !== false
            };

            // Filter out undefined values and parse with Zod schema
            const filteredWorker = Object.fromEntries(Object.entries(rawWorker).filter(([_, v]) => v !== undefined));
            const mappedWorker = WorkerSchema.parse(filteredWorker);

            items.push(mappedWorker);
        }

        const hasMoreData = (res?.Response_Results?.Page ?? 1) < totalPages;

        const result: z.infer<typeof OutputSchema> = { items };
        if (hasMoreData) {
            result.next_cursor = String(page + 1);
        }

        return result;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
