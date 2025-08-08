import type { NangoSync } from 'nango';
import type { Group } from '../models.js';
import type { ResponseWorkdayJobFamily } from '../types.js';

export function jobFamilyToDepartment(family: ResponseWorkdayJobFamily, _nango: NangoSync): Group {
    const data = family.Job_Family_Data;
    const group: Group = {
        id: family.Job_Family_Reference.ID.find((id) => id.attributes['wd:type'] === 'WID')!.$value,
        name: data.Name,
        active: data.Inactive !== true,
        created_at: new Date().toISOString() // No date available
    };

    return group;
}
