import type { Contact, CreateContactInput, UpdateContactInput, CreateUpdateContactOutput } from '../../models';
import type { HubSpotContact, HubSpotContactNonUndefined, HubSpotContactNonNull } from '../types';

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
