import type { Contact, CreateContactInput, UpdateContactInput, CreateUpdateContactOutput, UpsertContactInput, UpsertContactOutput } from '../../models';
import type { HubSpotContact, HubSpotContactNonUndefined, HubSpotContactNonNull, HubSpotUpsertContact, UpsertResource, UpsertResourceOutput } from '../types';

export function toContact(contact: HubSpotContactNonUndefined): Contact {
    return {
        id: contact.id,
        first_name: contact.properties.firstname,
        last_name: contact.properties.lastname,
        email: contact.properties.email,
        job_title: contact.properties.jobtitle,
        last_contacted: contact.properties.notes_last_contacted,
        last_activity_date: contact.properties.notes_last_updated,
        lead_status: contact.properties.hs_lead_status,
        lifecycle_stage: contact.properties.lifecyclestage,
        salutation: contact.properties.salutation,
        mobile_phone_number: contact.properties.mobilephone,
        website_url: contact.properties.website,
        created_date: contact.properties.createdate,
        owner: contact.properties.hubspot_owner_id
    };
}

export function createUpdatetoContact(contact: HubSpotContactNonNull): CreateUpdateContactOutput {
    return {
        id: contact.id,
        first_name: contact.properties.firstname,
        last_name: contact.properties.lastname,
        email: contact.properties.email,
        job_title: contact.properties.jobtitle,
        last_contacted: contact.properties.notes_last_contacted,
        last_activity_date: contact.properties.notes_last_updated,
        lead_status: contact.properties.hs_lead_status,
        lifecycle_stage: contact.properties.lifecyclestage,
        salutation: contact.properties.salutation,
        mobile_phone_number: contact.properties.mobilephone,
        website_url: contact.properties.website,
        created_date: contact.properties.createdate,
        owner: contact.properties.hubspot_owner_id
    };
}

export function toHubspotContact(contact: CreateContactInput | UpdateContactInput): Partial<HubSpotContact> {
    const hubSpotContact: Partial<HubSpotContact> = {
        properties: {}
    };

    if (contact.first_name) {
        hubSpotContact.properties!.firstname = contact.first_name;
    }

    if (contact.last_name) {
        hubSpotContact.properties!.lastname = contact.last_name;
    }

    if (contact.email) {
        hubSpotContact.properties!.email = contact.email;
    }

    if (contact.job_title) {
        hubSpotContact.properties!.jobtitle = contact.job_title;
    }

    if (contact.lead_status) {
        hubSpotContact.properties!.hs_lead_status = contact.lead_status;
    }

    if (contact.lifecycle_stage) {
        hubSpotContact.properties!.lifecyclestage = contact.lifecycle_stage;
    }

    if (contact.salutation) {
        hubSpotContact.properties!.salutation = contact.salutation;
    }

    if (contact.mobile_phone_number) {
        hubSpotContact.properties!.mobilephone = contact.mobile_phone_number;
    }

    if (contact.website_url) {
        hubSpotContact.properties!.website = contact.website_url;
    }

    if (contact.owner) {
        hubSpotContact.properties!.hubspot_owner_id = contact.owner;
    }

    return hubSpotContact;
}

export function toHubSpotContactUpsert(contact: UpsertContactInput): Partial<HubSpotUpsertContact> {
    const propertiesArray: UpsertResource[] = [];

    if (contact.first_name) {
        propertiesArray.push({ property: 'firstname', value: contact.first_name });
    }
    if (contact.last_name) {
        propertiesArray.push({ property: 'lastname', value: contact.last_name });
    }
    if (contact.email) {
        propertiesArray.push({ property: 'email', value: contact.email });
    }
    if (contact.job_title) {
        propertiesArray.push({ property: 'jobtitle', value: contact.job_title });
    }
    if (contact.lead_status) {
        propertiesArray.push({ property: 'hs_lead_status', value: contact.lead_status });
    }
    if (contact.lifecycle_stage) {
        propertiesArray.push({ property: 'lifecyclestage', value: contact.lifecycle_stage });
    }
    if (contact.salutation) {
        propertiesArray.push({ property: 'salutation', value: contact.salutation });
    }
    if (contact.mobile_phone_number) {
        propertiesArray.push({ property: 'mobilephone', value: contact.mobile_phone_number });
    }
    if (contact.website_url) {
        propertiesArray.push({ property: 'website', value: contact.website_url });
    }
    if (contact.owner) {
        propertiesArray.push({ property: 'hubspot_owner_id', value: contact.owner });
    }

    return { properties: propertiesArray };
}

export function upsertoContact(contact: UpsertResourceOutput): UpsertContactOutput {
    return {
        vid: contact.vid,
        is_new: contact.isNew
    };
}
