import type { NangoAction, ProxyConfiguration, SuccessResponse, GustoDeleteUser } from '../../models';
import type { GustoDeleteEmployee } from '../types';
import { idEntitySchema } from '../schema.zod.js';

export default async function runAction(nango: NangoAction, input: GustoDeleteUser): Promise<SuccessResponse> {
    await nango.zodValidateInput({ zodSchema: idEntitySchema, input });

    const { id, ...rest } = input;

    const gustoInput: GustoDeleteEmployee = {
        effective_date: rest.effectiveDate ? new Date(rest.effectiveDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
    };

    if (rest.runTerminationPayroll) {
        gustoInput.run_termination_payroll = rest.runTerminationPayroll;
    }

    const config: ProxyConfiguration = {
        // https://docs.gusto.com/embedded-payroll/reference/post-v1-employees-employee_id-terminations
        endpoint: `/v1/employees/${input.id}/terminations`,
        data: gustoInput,
        retries: 10
    };

    await nango.post(config);

    return {
        success: true
    };
}
