import type { AttioDealResponse } from '../types.js';

export function toDeal(record: AttioDealResponse) {
    const { id, created_at, web_url, values } = record;

    return {
        id: id.record_id,
        workspace_id: id.workspace_id,
        created_at,
        web_url,
        name: values.name?.[0]?.value,
        stage: values.stage?.[0]?.status.title,
        stage_id: values.stage?.[0]?.status.id.status_id,
        owner_id: values.owner?.[0]?.referenced_actor_id,
        value: values.value?.[0]?.currency_value,
        currency: values.value?.[0]?.currency_code,
        associated_people_ids: values.associated_people?.map((person) => person.target_record_id),
        associated_company_id: values.associated_company?.[0]?.target_record_id
    };
}
