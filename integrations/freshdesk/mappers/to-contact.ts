import type { FreshdeskContact } from '../types.js';
import type { Contact } from '../../models.js';

export function toContact(contact: FreshdeskContact): Contact {
    return {
        id: contact.id.toString(),
        name: contact.name,
        active: contact.active,
        email: contact.email,
        companyId: contact.company_id?.toString(),
        jobTitle: contact.job_title,
        phone: contact.phone,
        mobile: contact.mobile,
        createdAt: contact.created_at,
        updatedAt: contact.updated_at
    };
}
