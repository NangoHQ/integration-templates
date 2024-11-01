import type { NangoAction, ProxyConfiguration, UpsertContactInput, CreateUpdateContactOutput, UpsertContactOutput } from '../../models';
import { upsertContactInputSchema } from '../schema.zod.js';
import { toHubspotContact, createUpdatetoContact, toHubSpotContactUpsert, upsertoContact } from '../mappers/toContact.js';

export default async function runAction(nango: NangoAction, input: UpsertContactInput): Promise<CreateUpdateContactOutput | UpsertContactOutput> {
    const parsedInput = upsertContactInputSchema.safeParse(input);

    if (!parsedInput.success) {
        for (const error of parsedInput.error.errors) {
            await nango.log(`Invalid input provided to upsert a contact: ${error.message} at path ${error.path.join('.')}`, { level: 'error' });
        }
        throw new nango.ActionError({
            message: 'Invalid input provided to upsert a contact'
        });
    }

    return await upsertContact(nango, parsedInput.data);
}

async function upsertContact(nango: NangoAction, hubSpotContact: UpsertContactInput): Promise<CreateUpdateContactOutput | UpsertContactOutput> {
    if (hubSpotContact.email) {
        const config: ProxyConfiguration = {
            endpoint: `contacts/v1/contact/createOrUpdate/email/${encodeURIComponent(hubSpotContact.email)}`,
            data: toHubSpotContactUpsert(hubSpotContact),
            retries: 10
        };
        const response = await nango.post(config);
        return upsertoContact(response.data);
    } else {
        const config: ProxyConfiguration = {
            endpoint: 'crm/v3/objects/contacts',
            data: toHubspotContact(hubSpotContact),
            retries: 10
        };
        const response = await nango.post(config);
        return createUpdatetoContact(response.data);
    }
}
