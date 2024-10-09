import type { NangoAction, Company, CreateCompany } from '../../models';
import type { HubspotCompanyResponse } from '../types';
import { createCompanySchema } from '../schema.zod.js';

/**
 * Executes an action to create a company based on the provided input.
 * It validates the input against the defined schema, logs any validation errors,
 * and then sends a POST request to create a company if the input is valid.
 * @param nango - An instance of NangoAction used for logging and making API requests.
 * @param input - The input data required to create a company.
 * @returns A promise that resolves to the response from the API after creating the company.
 * @throws An ActionError if the input validation fails.
 */
export default async function runAction(nango: NangoAction, input: CreateCompany): Promise<Company> {
    const parsedInput = createCompanySchema.safeParse(input);

    if (!parsedInput.success) {
        for (const error of parsedInput.error.errors) {
            await nango.log(`Invalid input provided to create a company: ${error.message} at path ${error.path.join('.')}`, { level: 'error' });
        }
        throw new nango.ActionError({
            message: 'Invalid input provided to create a company'
        });
    }

    const response = await nango.post<HubspotCompanyResponse>({
        endpoint: `/crm/v3/objects/companies`,
        retries: 10,
        data: parsedInput.data
    });

    return {
        id: response.data.id,
        createdAt: response.data.createdAt,
        updatedAt: response.data.updatedAt,
        name: response.data.properties.name,
        domain: response.data.properties.domain,
        archived: response.data.archived
    };
}
