import type { NangoSync, RecruiterFlowCandidate, ProxyConfiguration } from '../../models';
import type { RecruiterFlowCandidateResponse } from '../types';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const proxyConfig: ProxyConfiguration = {
        // https://recruiterflow.com/api#/Candidate%20APIs/get_api_external_candidate_list
        endpoint: '/api/external/candidate/list',
        retries: 10,
        paginate: {
            type: 'offset',
            offset_name_in_request: 'current_page',
            limit_name_in_request: 'items_per_page',
            offset_start_value: 1,
            limit: 100,
            offset_calculation_method: 'per-page',
            response_path: 'data'
        }
    };

    for await (const page of nango.paginate<RecruiterFlowCandidateResponse>(proxyConfig)) {
        const candidates = page;
        await nango.batchSave(candidates.map(toCandidate), 'RecruiterFlowCandidate');
    }
}

function toCandidate(record: RecruiterFlowCandidateResponse): RecruiterFlowCandidate {
    const candidate: RecruiterFlowCandidate = {
        id: record.id,
        full_name: record.name,
        first_name: record.first_name,
        last_name: record.last_name,
        profile_picture_link: record.img_link || undefined, // Use undefined if null

        added_by_name: record.added_by.name,
        added_by_id: record.added_by.id,
        added_time: record.added_time,

        latest_activity_time: record.latest_activity_time || undefined,
        last_contacted_time: record.last_contacted || undefined,

        email_addresses: record.email || [],
        phone_numbers: record.phone_number || [],

        current_designation: record.current_designation || undefined,
        current_organization: record.current_organization || undefined,

        location_city: record.location.city || undefined,
        location_country: record.location.country || undefined,
        location_full_string: record.location.location || undefined,

        source: record.source_name,
        status_name: record.status.name || undefined
    };

    // --- Social Profiles ---
    // Assuming these are just handles/paths, if you need full URLs,
    // you'd prepend the base domain here (e.g., `https://linkedin.com/in/${record.linkedin_profile}`)
    if (record.linkedin_profile && record.linkedin_profile !== 'None') {
        candidate.linkedin_profile_url = record.linkedin_profile;
    }
    if (record.github_profile && record.github_profile !== 'None') {
        candidate.github_profile_url = record.github_profile;
    }
    if (record.twitter_profile && record.twitter_profile !== 'None') {
        candidate.twitter_profile_url = record.twitter_profile;
    }
    if (record.angellist_profile && record.angellist_profile !== 'None') {
        candidate.angellist_profile_url = record.angellist_profile;
    }
    if (record.behance_profile && record.behance_profile !== 'None') {
        candidate.behance_profile_url = record.behance_profile;
    }
    if (record.dribbble_profile && record.dribbble_profile !== 'None') {
        candidate.dribbble_profile_url = record.dribbble_profile;
    }
    if (record.facebook_profile && record.facebook_profile !== 'None') {
        candidate.facebook_profile_url = record.facebook_profile;
    }
    if (record.xing_profile && record.xing_profile !== 'None') {
        candidate.xing_profile_url = record.xing_profile;
    }

    // --- Attached files ---
    if (record.files && record.files.length > 0) {
        candidate.resume_links = record.files.map((file) => ({
            filename: file.filename,
            link: file.link
        }));
    }

    // --- Associated Jobs ---
    if (record.jobs && record.jobs.length > 0) {
        candidate.associated_jobs = record.jobs.map((job) => ({
            job_id: job.job_id,
            job_name: job.name,
            client_company_name: job.client_company_name,
            current_stage_name: job.stage_name,
            is_open: job.is_open
        }));
    }

    // --- Custom Fields ---
    // Ensure custom_fields array is not empty before assigning
    if (record.custom_fields && record.custom_fields.length > 0) {
        candidate.custom_fields = record.custom_fields.map((field) => ({
            id: field.id,
            name: field.name,
            value: field.value
        }));
    }

    return candidate;
}
