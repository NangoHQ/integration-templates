import type { NangoAction, SuccessResponse, BatchUpsertContactInput, ProxyConfiguration } from '../../models';
import { toBatchUpsertContact } from '../mappers/toContact';
import { batchUpsertContactInputSchema } from '../schema.zod.js';


export default async function runAction(nango: NangoAction, input: BatchUpsertContactInput): Promise<SuccessResponse> {
    const parsedInput = batchUpsertContactInputSchema.safeParse(input);


    if (!parsedInput.success) {
        for (const error of parsedInput.error.errors) {
            await nango.log(`Invalid input provided to upsert a contact: ${error.message} at path ${error.path.join('.')}`, { level: 'error' });
        }
        throw new nango.ActionError({
            message: 'Invalid input provided to upsert a contact'
        });
    }

    const hubSpotContactUpsert = toBatchUpsertContact(parsedInput.data as BatchUpsertContactInput);    
    
    // https://developers.hubspot.com/beta-docs/guides/api/crm/objects/contacts?uuid=0e730bc9-9531-4ef3-b417-e8b86d262203#upsert-contacts
    const endpoint = 'crm/v3/objects/contacts/batch/upsert'

    const config: ProxyConfiguration = {
        endpoint,
        data: hubSpotContactUpsert,
        retries: 10
    };
    
    await nango.post(config);

    return {
        success: true
    }
}   
