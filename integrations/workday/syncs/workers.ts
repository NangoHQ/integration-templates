import { createSync } from 'nango';
import { z } from 'zod';
import soap from 'soap';

const WORKDAY_VERSION = '44.0';

const WorkerSchema = z.object({
    id: z.string().describe('Worker unique identifier'),
    employee_id: z.string().optional().describe('Employee ID from Workday'),
    contingent_worker_id: z.string().optional().describe('Contingent Worker ID from Workday'),
    user_id: z.string().optional().describe('User ID from Workday'),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    hire_date: z.string().optional(),
    termination_date: z.string().optional(),
    is_active: z.boolean().optional(),
    worker_type: z.string().optional().describe('Employee or Contingent_Worker'),
    job_title: z.string().optional(),
    business_title: z.string().optional(),
    job_profile_id: z.string().optional(),
    position_id: z.string().optional(),
    manager_id: z.string().optional(),
    location_id: z.string().optional(),
    company_id: z.string().optional(),
    cost_center_id: z.string().optional(),
    department_id: z.string().optional()
});

const CheckpointSchema = z.object({
    page: z.number()
});

async function getSoapClient(
    type: 'Human_Resources' | 'Staffing',
    connection: {
        credentials: { type: string; username: string; password: string };
        connection_config: { hostname: string; tenant: string };
    }
) {
    const { credentials, connection_config } = connection;

    // WSDL from Workday's community site defines all operations and types
    const wsdlUrl = `https://community.workday.com/sites/default/files/file-hosting/productionapi/${type}/v${WORKDAY_VERSION}/${type}.wsdl`;
    // Actual requests go to the tenant's host, not the WSDL host
    const endpointUrl = `https://${connection_config.hostname}/ccx/service/${connection_config.tenant}/${type}/v${WORKDAY_VERSION}`;

    const client = await soap.createClientAsync(wsdlUrl, {});
    client.addHttpHeader('Accept-Encoding', 'gzip, deflate'); // required — omitting causes failures on some queries
    client.setSecurity(new soap.WSSecurity(credentials.username, credentials.password));
    client.setEndpoint(endpointUrl); // override WSDL default endpoint with the actual tenant URL
    return client;
}

interface IdObject {
    attributes?: {
        'wd:type'?: string;
    };
    $value?: string;
}

function isIdObject(value: unknown): value is IdObject {
    return typeof value === 'object' && value !== null;
}

const findId = (ids: unknown, type: string): string | undefined => {
    if (!ids) return undefined;
    const idArray = Array.isArray(ids) ? ids : [ids];
    const found = idArray.find((r: unknown) => {
        if (!isIdObject(r)) return false;
        const attr = r.attributes;
        if (typeof attr !== 'object' || attr === null) return false;
        return attr['wd:type'] === type;
    });
    if (found && isIdObject(found)) {
        return found.$value;
    }
    return undefined;
};

interface Credentials {
    type?: string;
    username?: string;
    password?: string;
}

function isBasicCredentials(creds: { type?: string }): creds is Credentials {
    return creds.type === 'BASIC';
}

const sync = createSync({
    description: 'Sync workers from Workday.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [{ method: 'GET', path: '/syncs/workers' }],
    checkpoint: CheckpointSchema,
    models: {
        Worker: WorkerSchema
    },

    exec: async (nango) => {
        const checkpointRaw = await nango.getCheckpoint();
        const checkpoint = checkpointRaw || { page: 1 };
        const connection = await nango.getConnection();

        // Validate connection credentials
        if (!isBasicCredentials(connection.credentials)) {
            throw new Error('Invalid credentials: BASIC auth is required.');
        }
        const username = connection.credentials.username;
        const password = connection.credentials.password;
        const hostname = connection.connection_config['hostname'];
        const tenant = connection.connection_config['tenant'];

        if (!username || !password || !hostname || !tenant) {
            throw new Error('Invalid credentials: username, password, hostname, and tenant are all required.');
        }

        // Blocker: Workday Get_Workers API does not support modified_since or updated_after filters.
        // The API only supports pagination via Page/Count in Response_Filter.
        // Therefore, we perform a full refresh with trackDeletesStart/trackDeletesEnd.
        await nango.trackDeletesStart('Worker');

        // https://community.workday.com/sites/default/files/file-hosting/productionapi/Human_Resources/v44.0/Get_Workers.html
        const client = await getSoapClient('Human_Resources', {
            credentials: { type: 'BASIC', username, password },
            connection_config: { hostname, tenant }
        });

        // Start from page 1 if no checkpoint, otherwise resume from saved page
        let page = checkpoint.page;
        let hasMoreData = true;

        do {
            // https://community.workday.com/sites/default/files/file-hosting/productionapi/Human_Resources/v44.0/Get_Workers.html
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const [res]: [any, string] = await client['Get_WorkersAsync']({
                Response_Filter: {
                    Page: page,
                    Count: 100
                },
                Response_Group: {
                    Include_Personal_Information: true,
                    Include_Employment_Information: true
                }
            });

            const workers = res?.Response_Data?.Worker ?? [];
            const mappedWorkers: z.infer<typeof WorkerSchema>[] = [];

            for (const worker of workers) {
                const workerData = worker.Worker_Data;
                if (!workerData) {
                    continue;
                }

                const personalData = workerData?.Personal_Data;
                const employmentData = workerData?.Employment_Data?.Worker_Job_Data?.[0];

                const workerId =
                    findId(worker.Worker_Reference?.ID, 'Employee_ID') ||
                    findId(worker.Worker_Reference?.ID, 'Contingent_Worker_ID') ||
                    findId(worker.Worker_Reference?.ID, 'WID');

                if (!workerId) {
                    continue;
                }

                const mappedWorker: z.infer<typeof WorkerSchema> = {
                    id: workerId,
                    employee_id: findId(worker.Worker_Reference?.ID, 'Employee_ID'),
                    contingent_worker_id: findId(worker.Worker_Reference?.ID, 'Contingent_Worker_ID'),
                    user_id: personalData?.User_ID,
                    first_name: personalData?.Name_Data?.First_Name,
                    last_name: personalData?.Name_Data?.Last_Name,
                    email: personalData?.Contact_Data?.Email_Address_Data?.[0]?.Email_Address,
                    phone: personalData?.Contact_Data?.Phone_Data?.[0]?.Phone_Number,
                    hire_date: employmentData?.Hire_Date,
                    termination_date: employmentData?.Termination_Date,
                    is_active: workerData?.Active !== '0' && workerData?.Active !== false,
                    worker_type: findId(workerData?.Worker_Type_Reference?.ID, 'Worker_Type_ID'),
                    job_title: employmentData?.Job_Profile_Data?.[0]?.Job_Title,
                    business_title: employmentData?.Business_Title,
                    job_profile_id: findId(employmentData?.Job_Profile_Data?.[0]?.Job_Profile_Reference?.ID, 'Job_Profile_ID'),
                    position_id: findId(employmentData?.Position_Data?.Position_Reference?.ID, 'Position_ID'),
                    manager_id:
                        findId(employmentData?.Manager_Reference?.ID, 'Employee_ID') || findId(employmentData?.Manager_Reference?.ID, 'Contingent_Worker_ID'),
                    location_id: findId(employmentData?.Business_Site_Summary_Data?.Location_Reference?.ID, 'Location_ID'),
                    company_id: findId(employmentData?.Company_Summary_Data?.Company_Reference?.ID, 'Company_Reference_ID'),
                    cost_center_id: findId(employmentData?.Cost_Center_Summary_Data?.Cost_Center_Reference?.ID, 'Cost_Center_Reference_ID'),
                    department_id: findId(employmentData?.Department_Summary_Data?.Department_Reference?.ID, 'Organization_Reference_ID')
                };

                mappedWorkers.push(mappedWorker);
            }

            if (mappedWorkers.length > 0) {
                await nango.batchSave(mappedWorkers, 'Worker');
            }

            hasMoreData = res.Response_Results.Page < res.Response_Results.Total_Pages;

            if (hasMoreData) {
                page += 1;
                await nango.saveCheckpoint({ page });
            }
        } while (hasMoreData);

        await nango.trackDeletesEnd('Worker');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
