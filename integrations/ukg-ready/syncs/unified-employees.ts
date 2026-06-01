import { createSync } from 'nango';
import type { EmployeeDetails, ChangedEmployeeDetails } from '../types.js';
import { toEmployee } from '../mappers/to-employee.js';
import { fetchEmployeeInfo } from '../helpers/fetch-employee-info.js';

import type { ProxyConfiguration } from 'nango';
import { StandardEmployee } from '../models.js';
import * as z from 'zod';

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const sync = createSync({
    description: 'Fetch all employees from UKG Ready and maps them to the standard HRIS model',
    version: '0.1.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,

    endpoints: [
        {
            method: 'GET',
            path: '/employees/unified',
            group: 'Unified HRIS API'
        }
    ],

    models: {
        StandardEmployee: StandardEmployee
    },

    metadata: z.object({}),

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint ? CheckpointSchema.parse(rawCheckpoint) : undefined;
        const checkpointUpdatedAfter = checkpoint?.updated_after ? new Date(checkpoint.updated_after) : undefined;
        const runStartedAt = new Date().toISOString();
        const connection = await nango.getConnection();

        if (checkpointUpdatedAfter) {
            await incremental(nango, connection, checkpointUpdatedAfter);
        } else {
            await initial(nango, connection);
        }

        await nango.saveCheckpoint({ updated_after: runStartedAt });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;

async function initial(nango: NangoSyncLocal, connection: Record<string, any>) {
    const config: ProxyConfiguration = {
        // https://doc.people-doc.com/client/api/index-v2.html
        endpoint: `/ta/rest/v2/companies/${connection['connection_config']['realmId']}/employees`,
        retries: 10
    };

    const response = await nango.get<{ employees: EmployeeDetails[] }>(config);
    const { data } = response;

    const savedEmployees: StandardEmployee[] = [];

    for (const employee of data.employees) {
        const employeeInfo = await fetchEmployeeInfo(nango, connection['connection_config']['realmId'], employee.id.toString());
        const standardEmployee = toEmployee(employeeInfo);
        savedEmployees.push(standardEmployee);

        if (savedEmployees.length >= 100) {
            await nango.batchSave(savedEmployees, 'StandardEmployee');
            savedEmployees.length = 0;
        }
    }
    if (savedEmployees.length > 0) {
        await nango.batchSave(savedEmployees, 'StandardEmployee');
    }
}

async function incremental(nango: NangoSyncLocal, connection: Record<string, any>, checkpointUpdatedAfter: Date) {
    const config: ProxyConfiguration = {
        // https://doc.people-doc.com/client/api/index-v2.html
        endpoint: `/ta/rest/v2/companies/${connection['connection_config']['realmId']}/employees/changed`,
        params: {
            since: checkpointUpdatedAfter.toISOString()
        },
        retries: 10
    };

    const response = await nango.get<{ entries: ChangedEmployeeDetails[] }>(config);
    const { data } = response;

    const savedEmployees: StandardEmployee[] = [];

    for (const employee of data.entries) {
        const employeeInfo = await fetchEmployeeInfo(nango, connection['connection_config']['realmId'], employee.object.id.toString());

        const standardEmployee = toEmployee(employeeInfo);
        savedEmployees.push(standardEmployee);

        if (savedEmployees.length >= 100) {
            await nango.batchSave(savedEmployees, 'StandardEmployee');
            savedEmployees.length = 0;
        }
    }
    if (savedEmployees.length > 0) {
        await nango.batchSave(savedEmployees, 'StandardEmployee');
    }
}
