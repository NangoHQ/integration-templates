import type { AttioPerson } from '../../models';
import type { AttioPersonResponse } from '../types';
import { toSocialLinks } from './to-social-links.js';

export function toPerson(record: AttioPersonResponse): AttioPerson {
    const { id, created_at, web_url, values } = record;

    return {
        id: id.record_id,
        workspace_id: id.workspace_id,
        created_at,
        web_url,
        first_name: values.name?.first_name,
        last_name: values.name?.last_name,
        full_name: values.name?.full_name,
        email_addresses: values.email_addresses?.map((email) => ({
            email: email.email_address,
            domain: email.email_domain
        })),
        phone_numbers: values.phone_numbers?.map((phone) => ({
            number: phone.phone_number,
            country_code: phone.country_code
        })),
        job_title: values.job_title,
        company_id: values.company?.[0]?.target_record_id,
        description: values.description,
        avatar_url: values.avatar_url,
        social_links: toSocialLinks(values),
        location: values.primary_location
            ? {
                  line_1: values.primary_location.line_1,
                  line_2: values.primary_location.line_2,
                  city: values.primary_location.locality,
                  state: values.primary_location.region,
                  postal_code: values.primary_location.postcode,
                  country_code: values.primary_location.country_code
              }
            : undefined
    };
}
