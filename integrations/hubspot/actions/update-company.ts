import type { NangoAction, Company, UpdateCompany } from '../../models';
import { updateCompanySchema } from '../schema.zod.js';
import type { HubspotCompanyResponse } from '../types';

/**
 * Executes an action to update a company based on the provided input.
 * It validates the input against the defined schema, logs any validation errors,
 * and then sends a PATCH request to update a company if the input is valid.
 * @param nango - An instance of NangoAction used for logging and making API requests.
 * @param input - The input data required to update a company.
 * @returns A promise that resolves to the response from the API after creating the company.
 * @throws An ActionError if the input validation fails.
 */
export default async function runAction(nango: NangoAction, input: UpdateCompany): Promise<Company> {
    const parsedInput = updateCompanySchema.safeParse(input);

    if (!parsedInput.success) {
        for (const error of parsedInput.error.errors) {
            await nango.log(`Invalid input provided to update a company: ${error.message} at path ${error.path.join('.')}`, { level: 'error' });
        }
        throw new nango.ActionError({
            message: 'Invalid input provided to update a company'
        });
    }

    for (const key in parsedInput.data.input.properties) {
        const lowerKey = key.toLowerCase();
        if (lowerKey !== key) {
            parsedInput.data.input.properties[lowerKey] = parsedInput.data.input.properties[key];
            delete parsedInput.data.input.properties[key];
        }
    }

    const inputData = parsedInput.data;

    const response = await nango.patch<HubspotCompanyResponse>({
        endpoint: `/crm/v3/objects/companies/${inputData.companyId}`,
        retries: 10,
        data: inputData.input,
        ...(inputData.input.idProperty ? { params: { idProperty: inputData.input.idProperty } } : {})
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
