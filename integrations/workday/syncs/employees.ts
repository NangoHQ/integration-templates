import { createSync } from 'nango';
import { z } from 'zod';
import soap from 'soap';
const WORKDAY_VERSION = '44.0';

async function withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
    for (let attempt = 0; attempt < retries; attempt++) {
        // @allowTryCatch
        try {
            return await fn();
        } catch (err) {
            if (attempt === retries - 1) throw err;
            await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
        }
    }
    throw new Error('unreachable');
}

const EmployeeSchema = z.object({
    id: z.string(),
    worker_id: z.string().optional(),
    employee_id: z.string().optional(),
    contingent_worker_id: z.string().optional(),
    user_id: z.string().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    hire_date: z.string().optional(),
    termination_date: z.string().optional(),
    active: z.boolean().optional(),
    job_title: z.string().optional(),
    department: z.string().optional(),
    location: z.string().optional(),
    manager_id: z.string().optional(),
    employment_type: z.string().optional(),
    last_updated: z.string().optional()
});

const findId = (ids: any, type: string): string | undefined => (Array.isArray(ids) ? ids : [ids]).find((r: any) => r?.attributes?.['wd:type'] === type)?.$value;

async function getSoapClient(connection: any) {
    const { credentials, connection_config } = connection;

    if (credentials.type !== 'BASIC' || !credentials.username || !credentials.password || !connection_config['hostname'] || !connection_config['tenant']) {
        throw new Error('Invalid credentials: BASIC auth, username, password, hostname, and tenant are all required.');
    }

    const wsdlUrl = `https://community.workday.com/sites/default/files/file-hosting/productionapi/Human_Resources/v${WORKDAY_VERSION}/Human_Resources.wsdl`;
    const endpointUrl = `https://${connection_config['hostname']}/ccx/service/${connection_config['tenant']}/Human_Resources/v${WORKDAY_VERSION}`;

    const client = await soap.createClientAsync(wsdlUrl, {});
    client.addHttpHeader('Accept-Encoding', 'gzip, deflate');
    client.setSecurity(new soap.WSSecurity(credentials.username, credentials.password));
    client.setEndpoint(endpointUrl);
    return client;
}

const sync = createSync({
    description: 'Sync Workday employees and contingent workers.',
    version: '3.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [{ method: 'GET', path: '/syncs/employees' }],
    models: {
        Employee: EmployeeSchema
    },

    exec: async (nango) => {
        const connection = await nango.getConnection();
        const client = await getSoapClient(connection);

        await nango.trackDeletesStart('Employee');

        let page = 1;
        let hasMoreData = true;

        do {
            await nango.log(`Fetching page ${page}`);

            // https://community.workday.com/sites/default/files/file-hosting/productionapi/Human_Resources/v44.0/Get_Workers.html
            const [res]: [any, string] = await withRetry(() =>
                client['Get_WorkersAsync']({
                    Response_Filter: {
                        Page: page,
                        Count: 100
                    },
                    Response_Group: {
                        Include_Personal_Information: true,
                        Include_Employment_Information: true
                    }
                })
            );

            const rawWorkers = res?.Response_Data?.Worker;
            const workers = Array.isArray(rawWorkers) ? rawWorkers : rawWorkers ? [rawWorkers] : [];
            const totalPages = res?.Response_Results?.Total_Pages ?? 1;
            hasMoreData = page < totalPages;
            page += 1;

            const employees: z.infer<typeof EmployeeSchema>[] = [];

            for (const worker of workers) {
                const workerData = worker.Worker_Data ?? {};
                const personalData = workerData?.Personal_Data ?? {};
                const employmentData = workerData?.Employment_Data ?? {};
                const organizationData = employmentData?.Worker_Position_Data?.[0]?.Organization_Data ?? {};

                const wid = findId(worker.Worker_Reference?.ID, 'WID');
                const employeeId = findId(worker.Worker_Reference?.ID, 'Employee_ID');
                const contingentWorkerId = findId(worker.Worker_Reference?.ID, 'Contingent_Worker_ID');

                const stableId = wid ?? employeeId ?? contingentWorkerId ?? workerData?.Worker_ID;
                if (!stableId) {
                    await nango.log(`Skipping worker with no stable ID`);
                    continue;
                }

                const nameData = personalData?.Name_Data?.Legal_Name_Data?.Name_Detail_Data ?? {};
                const emailData =
                    (personalData?.Contact_Data?.Email_Address_Data ?? []).find(
                        (e: any) => e?.Usage_Data?.Type_Data?.Type_Reference?.ID?.[0]?.['$value'] === 'WORK'
                    ) || personalData?.Contact_Data?.Email_Address_Data?.[0];
                const phoneData =
                    (personalData?.Contact_Data?.Phone_Data ?? []).find((p: any) => p?.Usage_Data?.Type_Data?.Type_Reference?.ID?.[0]?.['$value'] === 'WORK') ||
                    personalData?.Contact_Data?.Phone_Data?.[0];

                const positionData = employmentData?.Worker_Position_Data?.[0] ?? {};
                const locationRef = positionData?.Business_Site_Summary_Data?.Location_Reference;
                const managerRef = organizationData?.Supervisory_Organization_Data?.Manager_Reference;
                const hireDate = employmentData?.Worker_Status_Data?.Hire_Date || employmentData?.Hire_Date;
                const activeStatus = employmentData?.Worker_Status_Data?.Active;

                employees.push({
                    id: stableId,
                    worker_id: workerData?.Worker_ID,
                    employee_id: employeeId,
                    contingent_worker_id: contingentWorkerId,
                    user_id: personalData?.User_ID,
                    first_name: nameData?.First_Name,
                    last_name: nameData?.Last_Name,
                    email: emailData?.Email_Address,
                    phone: phoneData?.Formatted_Phone,
                    hire_date: hireDate,
                    termination_date: employmentData?.Worker_Status_Data?.Termination_Date,
                    active: activeStatus === '1' || activeStatus === true,
                    job_title: positionData?.Job_Profile_Summary_Data?.Job_Profile_Name,
                    department: findId(organizationData?.Supervisory_Organization_Data?.Organization_Reference?.ID, 'Organization_Reference_ID'),
                    location: locationRef?.Organization_Name,
                    manager_id: findId(managerRef?.ID, 'Employee_ID') || findId(managerRef?.ID, 'Contingent_Worker_ID'),
                    employment_type: employeeId ? 'Employee' : contingentWorkerId ? 'Contingent Worker' : undefined,
                    last_updated: workerData?.Last_Updated_DateTime
                });
            }

            if (employees.length > 0) {
                await nango.batchSave(employees, 'Employee');
            }
        } while (hasMoreData);

        await nango.trackDeletesEnd('Employee');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
