import type { NangoAction, CreateContact, ContactActionResponse, FailedContact, ActionErrorResponse, ProxyConfiguration } from '../../models';
import type { Contact as XeroContact } from '../types';
import { getTenantId } from '../helpers/get-tenant-id.js';
import { toXeroContact, toContact } from '../mappers/to-contact.js';

export default async function runAction(nango: NangoAction, input: CreateContact[]): Promise<ContactActionResponse> {
    const tenant_id = await getTenantId(nango);

    // Check if input is an array
    if (!input || !input.length) {
        throw new nango.ActionError<ActionErrorResponse>({
            message: `You must pass an array of contacts! Received: ${JSON.stringify(input)}`
        });
    }

    // Check if every contact has at least name set (this is required by Xero)
    const invalidContacts = input.filter((x: any) => !x.name);
    if (invalidContacts.length > 0) {
        throw new nango.ActionError<ActionErrorResponse>({
            message: `Some contacts are missing the name property, which is mandatory in Xero. Affected contacts:\n${JSON.stringify(invalidContacts, null, 4)}`
        });
    }

    const config: ProxyConfiguration = {
        // https://developer.xero.com/documentation/api/accounting/contacts/#post-contacts
        endpoint: 'api.xro/2.0/Contacts',
        headers: {
            'xero-tenant-id': tenant_id
        },
        params: {
            summarizeErrors: 'false'
        },
        data: {
            Contacts: input.map(toXeroContact)
        },
        retries: 3
    };

    const res = await nango.post(config);
    const contacts: XeroContact[] = res.data.Contacts;

    // Check if Xero failed import of any contacts
    const failedContacts = contacts.filter((x: any) => x.HasValidationErrors);
    if (failedContacts.length > 0) {
        await nango.log(
            `Some contacts could not be created in Xero due to validation errors. Note that the remaining contacts (${
                input.length - failedContacts.length
            }) were created successfully. Affected contacts:\n${JSON.stringify(failedContacts, null, 4)}`,
            { level: 'error' }
        );
    }

    const succeededContacts = contacts.filter((x: any) => !x.HasValidationErrors);

    const response = {
        succeededContacts: succeededContacts.map(toContact),
        failedContacts: failedContacts.map(mapFailedXeroContact)
    };

    return response;
}

function mapFailedXeroContact(xeroContact: any): FailedContact {
    return {
        ...toContact(xeroContact),
        validation_errors: xeroContact.ValidationErrors
    };
}
