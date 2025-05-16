import type { AttioCompanyResponse } from '../types.js';
import type { AttioCompany } from '../../models.js';

export function toCompany(record: AttioCompanyResponse): AttioCompany {
    const { id, created_at, web_url, values } = record;

    const socialLinks = [];
    if (values.linkedin?.[0]?.value) {
        socialLinks.push({ name: 'linkedin', url: values.linkedin[0].value });
    }
    if (values.twitter?.[0]?.value) {
        socialLinks.push({ name: 'twitter', url: values.twitter[0].value });
    }
    if (values.facebook?.[0]?.value) {
        socialLinks.push({ name: 'facebook', url: values.facebook[0].value });
    }
    if (values.instagram?.[0]?.value) {
        socialLinks.push({ name: 'instagram', url: values.instagram[0].value });
    }
    if (values.angellist?.[0]?.value) {
        socialLinks.push({ name: 'angellist', url: values.angellist[0].value });
    }

    return {
        id: id.record_id,
        workspace_id: id.workspace_id,
        created_at,
        web_url,
        name: values.name?.[0]?.value,
        domains: values.domains?.map((domain) => ({
            domain: domain.domain,
            root_domain: domain.root_domain
        })),
        description: values.description?.[0]?.value,
        team_member_ids: values.team?.map((member) => member.target_record_id),
        location: values.primary_location?.[0]
            ? {
                  country_code: values.primary_location[0].country_code,
                  line_1: values.primary_location[0].line_1,
                  line_2: values.primary_location[0].line_2,
                  city: values.primary_location[0].locality,
                  state: values.primary_location[0].region,
                  postal_code: values.primary_location[0].postcode
              }
            : undefined,
        categories: values.categories?.map((cat) => cat.option.title),
        logo_url: values.logo_url?.[0]?.value,
        twitter_follower_count: values.twitter_follower_count?.[0]?.value,
        foundation_date: values.foundation_date?.[0]?.value,
        estimated_arr_usd: values.estimated_arr_usd?.[0]?.value,
        social_links: socialLinks.length > 0 ? socialLinks : undefined
    };
}
