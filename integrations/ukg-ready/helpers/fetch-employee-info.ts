import type { NangoSync, ProxyConfiguration } from "nango";
import type { SingleEmployeeResponse } from "../types.js";

export async function fetchEmployeeInfo(
  nango: NangoSync,
  realmId: string,
  employeeId: string,
): Promise<SingleEmployeeResponse> {
  const config: ProxyConfiguration = {
    // https://doc.people-doc.com/client/api/index-v2.html
    endpoint: `/ta/rest/v2/companies/${realmId}/employees/${employeeId}`,
    retries: 10,
  };

  const response = await nango.get<SingleEmployeeResponse>(config);
  const { data } = response;

  return data;
}
