import type { NangoSync } from '@nangohq/node';
import type { StandardEmployee } from './models.js';
import type { ResponseGet_WorkersAsync } from './types.js';
import { toStandardEmployee } from './mappers/to-standard-employee.js';

/**
 * Fetches all employees from Workday and maps them to the standardized HRIS model
 */
export default async function fetchData(nango: NangoSync) {
    // Get all workers from Workday
    const response = await nango.get<ResponseGet_WorkersAsync>({
        endpoint: '/workers',
        retries: 10
    });

    const workers = response.data.Report_Entry.Worker || [];
    const standardEmployees: StandardEmployee[] = [];

    // Map each worker to our standardized model
    for (const worker of workers) {
        try {
            const standardEmployee = await toStandardEmployee(worker, nango);
            standardEmployees.push(standardEmployee);
        } catch (error) {
            await nango.log(`Error mapping worker ${worker.Worker_Reference.ID[0]?.$value || 'unknown'}: ${error}`);
        }
    }

    return standardEmployees;
}
