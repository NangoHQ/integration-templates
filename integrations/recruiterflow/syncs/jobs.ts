import type { NangoSync, RecruiterFlowJob, ProxyConfiguration } from '../../models';
import type { RecruiterFlowJobResponse } from '../types';

export default async function fetchData(nango: NangoSync): Promise<void> {
    const proxyConfig: ProxyConfiguration = {
        // https://recruiterflow.com/api#/Job%20APIs/get_api_external_job_list
        endpoint: '/api/external/job/list',
        retries: 10,
        paginate: {
            type: 'offset',
            response_path: 'data',
            offset_name_in_request: 'current-page',
            offset_calculation_method: 'per-page',
            offset_start_value: 1,
            limit_name_in_request: 'items-per-page',
            limit: 100
        }
    };

    // Use nango.paginate to handle pagination
    for await (const page of nango.paginate(proxyConfig)) {
        const jobs = page as RecruiterFlowJobResponse[];
        await nango.batchSave(jobs.map(toJob), 'RecruiterFlowJob');
    }
}

function toJob(record: RecruiterFlowJobResponse): RecruiterFlowJob {
    const job: RecruiterFlowJob = {
        id: record.id,
        title: record.title,
        apply_link: record.apply_link,
        company_name: record.company.name,
        company_logo_link: record.company.img_link,
        locations: record.locations.map((loc) => ({
            id: loc.id,
            city: loc.city,
            country: loc.country,
            name: loc.name
        })),
        department: record.department,
        employment_type: record.employment_type,
        job_type_name: record.job_type.name,
        experience_range_start: record.experience_range_start,
        experience_range_end: record.experience_range_end,
        is_open: record.is_open,
        job_status_name: record.job_status.name,
        number_of_openings: record.number_of_openings || record.current_opening
    };

    if (record.salary_range_start !== undefined) {
        job.salary_range_start = record.salary_range_start;
    }
    if (record.salary_range_end !== undefined) {
        job.salary_range_end = record.salary_range_end;
    }
    if (record.salary_range_currency !== undefined) {
        job.salary_range_currency = record.salary_range_currency;
    }
    if (record.salary_frequency !== undefined) {
        job.salary_frequency = record.salary_frequency;
    }

    if (record.pay_rate) {
        job.pay_rate_number = record.pay_rate.number;
        job.pay_rate_currency = record.pay_rate.currency;
        job.pay_rate_frequency_display_name = record.pay_rate.frequency.display_name;
    }

    if (record.bill_rate) {
        job.bill_rate_number = record.bill_rate.number;
        job.bill_rate_currency = record.bill_rate.currency;
        job.bill_rate_frequency_display_name = record.bill_rate.frequency.display_name;
    }

    if (record.contract_start_date !== undefined) {
        job.contract_start_date = record.contract_start_date;
    }
    if (record.contract_end_date !== undefined) {
        job.contract_end_date = record.contract_end_date;
    }

    if (record.work_quantum) {
        job.work_quantum_number = record.work_quantum.number;
        job.work_quantum_unit_display_name = record.work_quantum.unit.display_name;
        job.work_quantum_frequency_display_name = record.work_quantum.frequency.display_name;
        job.work_quantum_is_full_time = record.work_quantum.is_full_time;
    }

    if (record.expected_salary) {
        job.expected_salary_number = record.expected_salary.number;
        job.expected_salary_currency = record.expected_salary.currency;
    }
    if (record.expected_fee) {
        job.expected_fee_number = record.expected_fee.number;
        job.expected_fee_currency = record.expected_fee.currency;
    }
    if (record.commission_rate !== undefined) {
        job.commission_rate = record.commission_rate;
    }

    if (record.expected_start_date !== undefined) {
        job.expected_start_date = record.expected_start_date;
    }
    if (record.expected_end_date !== undefined) {
        job.expected_end_date = record.expected_end_date;
    }

    if (record.custom_fields && record.custom_fields.length > 0) {
        job.custom_fields = record.custom_fields.map((field) => ({
            id: field.id,
            name: field.name,
            value: field.value
        }));
    }

    if (record.files && record.files.length > 0) {
        job.files_links = record.files.map((file) => file.link);
    }

    return job;
}
