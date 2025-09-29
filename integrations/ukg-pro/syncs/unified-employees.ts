import { createSync } from "nango";
import { toEmployee } from "../mappers/to-employee.js";
import type { EmployeeDetails } from "../types.js";

import type { ProxyConfiguration } from "nango";
import { StandardEmployee } from "../models.js";
import * as z from "zod";

const sync = createSync({
  description:
    "Fetch all employees from UKG Pro and maps them to the standard HRIS model",
  version: "0.0.1",
  frequency: "every hour",
  autoStart: true,
  syncType: "incremental",
  trackDeletes: false,

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
    const baseConfig: ProxyConfiguration = {
      // https://developer.ukg.com/hcm/reference/employeechanges_get_all
      endpoint: "/personnel/v1/employee-changes",
      params: {
        ...(nango.lastSyncDate && {
          startDate: nango.lastSyncDate.toISOString(),
          endDate: new Date().toISOString(),
        }),
      },
      paginate: {
        limit: 100,
        type: "offset",
        offset_name_in_request: "page",
        offset_start_value: 1,
        offset_calculation_method: "per-page",
        limit_name_in_request: "per_page",
      },
      retries: 10,
    };

    for await (const response of nango.paginate<EmployeeDetails>(baseConfig)) {
      const standardEmployees = response.map(toEmployee);
      await nango.batchSave(standardEmployees, "StandardEmployee");
    }
  },
});

export type NangoSyncLocal = Parameters<(typeof sync)["exec"]>[0];
export default sync;
