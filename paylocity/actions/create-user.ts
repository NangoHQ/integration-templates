import type { CreateUser, NangoAction, ProxyConfiguration } from '../../models';
import { createUserSchema } from '../../schema.zod';

export default async function runAction(nango: NangoAction, input: CreateUser) {
    const connection = await nango.getConnection();
    const companyId = connection.connection_config['companyId'];
    const parseResult = createUserSchema.safeParse(input);
    if (!parseResult.success) {
        const msg = parseResult.error.errors.map((e) => e.message).join('; ');
        throw new nango.ActionError({
            message: `Invalid create-employee input: ${msg}`
        });
    }

    const { firstName, lastName, email } = parseResult.data;

    const config: ProxyConfiguration = {
        // https://developer.paylocity.com/integrations/reference/add-employee
        endpoint: `/api/v2/companies/${companyId}/employees`,
        data: {
            firstName,
            lastName,
            homeAddress: {
                emailAddress: email
            }
        },
        retries: 10
    };

    const resp = await nango.post<{ employeeId: string }>(config);

    return {
        id: resp.data.employeeId,
        ...input
    };
}
