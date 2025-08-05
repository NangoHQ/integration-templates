import type { SapSuccessDepartment } from '../types.js';
import type { Group } from '../../models';
import { parseSapDateToISOString } from '../helpers/utils.js';

export function toGroup(department: SapSuccessDepartment): Group {
    return {
        id: department.externalCode,
        name: department.name,
        name_localized: department.name_localized || '',
        name_en_US: department.name_en_US,
        name_defaultValue: department.name_defaultValue,
        description: department.description,
        startDate: parseSapDateToISOString(department.startDate),
        endDate: parseSapDateToISOString(department.endDate),
        parent: department.parent,
        costCenter: department.costCenter,
        headOfUnit: department.headOfUnit,
        status: department.status,
        createdDateTime: parseSapDateToISOString(department.createdDateTime),
        lastModifiedDateTime: parseSapDateToISOString(department.lastModifiedDateTime),
        entityUUID: department.entityUUID
    };
}
