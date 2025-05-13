import type { Candidate } from '../../models';
import type { GemCandidate } from '../types';
import { toApplication } from './to-application.js';

export function toCandidate(response: GemCandidate): Candidate {
    return {
        id: response.id,
        first_name: response.first_name,
        last_name: response.last_name,
        company: response.company ?? null,
        title: response.title,
        attachments: response.attachments.map((attachment) => ({
            filename: attachment.filename,
            url: attachment.url,
            type: attachment.type,
            created_at: attachment.created_at
        })),
        phone_numbers: response.phone_numbers.map((phone) => ({
            type: phone.type,
            value: phone.value
        })),
        email_addresses: response.email_addresses.map((email) => ({
            type: email.type,
            value: email.value,
            is_primary: email.is_primary
        })),
        social_media_addresses: response.social_media_addresses.map((social) => ({
            value: social.value
        })),
        tags: response.tags,
        educations: response.educations.map((education) => ({
            id: education.id,
            school_name: education.school_name,
            degree: education.degree,
            discipline: education.discipline,
            start_date: education.start_date,
            end_date: education.end_date
        })),
        employments: response.employments.map((employment) => ({
            id: employment.id,
            company_name: employment.company_name,
            title: employment.title,
            start_date: employment.start_date,
            end_date: employment.end_date
        })),
        linked_user_ids: response.linked_user_ids,
        created_at: response.created_at,
        updated_at: response.updated_at ?? null,
        last_activity: response.last_activity,
        deleted_at: response.deleted_at ?? null,
        is_private: response.is_private,
        applications: response.applications?.map(toApplication) ?? [],
        application_ids: response.application_ids
    };
}
