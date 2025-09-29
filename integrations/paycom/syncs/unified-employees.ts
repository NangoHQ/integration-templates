import { createSync } from "nango";
import type { PaycomEmployee, PaycomDetailedEmployee } from "../types.js";
import {
  toStandardEmployee,
  toStandardEmployeeDetailed,
} from "../mappers/to-standard-employee.js";

import type { ProxyConfiguration } from "nango";
import { StandardEmployee } from "../models.js";
import * as z from "zod";

const sync = createSync({
  description:
    "Fetches a list of current employees from Paycom and maps them to the standard HRIS model",
  version: "0.0.1",
  frequency: "every hour",
  autoStart: true,
  syncType: "full",

  endpoints: [
    {
      method: "GET",
      path: '/employees/unified',
      group: 'Unified HRIS API'
    },
  ],

  models: {
    StandardEmployee: StandardEmployee,
  },

  metadata: z.object({}),

  exec: async (nango) => {
    const directoryConfig: ProxyConfiguration = {
      // https://www.postman.com/motorwerks/motorwerks-s-public-workspace/documentation/abkrg5d/paycom-api?entity=request-8871016-c3e6163a-6650-4751-83f9-f286b5863ebc
      endpoint: "/v4/rest/index.php/api/v1/employeedirectory",
      retries: 10,
      paginate: {
        type: "offset",
        offset_name_in_request: "page",
        offset_start_value: 1,
        offset_calculation_method: "per-page",
        response_path: "data",
      },
    };

    let totalEmployeesProcessed = 0;
    const batchSize = 100; // Process employees in batches of 100
    let currentBatch: any[] = [];

    for await (const paycomEmployeesResponseArray of nango.paginate<PaycomEmployee>(
      directoryConfig,
    )) {
      await nango.log(
        `Processing ${paycomEmployeesResponseArray.length} employees from directory`,
      );

      for (const employee of paycomEmployeesResponseArray) {
        if (!employee) {
          continue;
        }

        // @allowTryCatch
        try {
          const detailedConfig: ProxyConfiguration = {
            // https://www.postman.com/motorwerks/motorwerks-s-public-workspace/documentation/abkrg5d/paycom-api?entity=request-8871016-c3e6163a-6650-4751-83f9-f286b5863ebc
            endpoint: `/v4/rest/index.php/api/v1/employee/${employee.eecode}`,
            retries: 5,
          };

          const detailedResponse = await nango.get<{
            data: PaycomDetailedEmployee;
          }>(detailedConfig);

          if (detailedResponse.data) {
            const standardEmployee = toStandardEmployeeDetailed(
              detailedResponse.data.data[0],
            );
            currentBatch.push(standardEmployee);
          } else {
            // Fallback to basic employee data if detailed fetch fails
            const standardEmployee = toStandardEmployee(employee);
            currentBatch.push(standardEmployee);
            await nango.log(
              `Fallback to basic data for employee ${employee.eecode}`,
              { level: "warn" },
            );
          }
        } catch (error: any) {
          // If detailed fetch fails, use basic employee data
          const standardEmployee = toStandardEmployee(employee);
          currentBatch.push(standardEmployee);
          await nango.log(
            `Error fetching detailed data for employee ${employee.eecode}: ${error}`,
            { level: "warn" },
          );
        }

        // Save batch when it reaches the batch size
        if (currentBatch.length >= batchSize) {
          await nango.batchSave(currentBatch, "StandardEmployee");
          totalEmployeesProcessed += currentBatch.length;
          await nango.log(
            `Saved batch of ${currentBatch.length} employees. Total processed: ${totalEmployeesProcessed}`,
          );
          currentBatch = []; // Reset batch
        }
      }
    }

    // Save any remaining employees in the final batch
    if (currentBatch.length > 0) {
      await nango.batchSave(currentBatch, "StandardEmployee");
      totalEmployeesProcessed += currentBatch.length;
      await nango.log(
        `Saved final batch of ${currentBatch.length} employees. Total processed: ${totalEmployeesProcessed}`,
      );
    }

    await nango.log(`Total employees processed: ${totalEmployeesProcessed}`);
    await nango.deleteRecordsFromPreviousExecutions("StandardEmployee");
  },
});

export type NangoSyncLocal = Parameters<(typeof sync)["exec"]>[0];
export default sync;
