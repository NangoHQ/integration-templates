import { NangoSync } from "nango";
import type { Employee } from '../models.js';
import type { ResponseWorkdayWorker } from '../types.js';

export async function workerToEmployee(worker: ResponseWorkdayWorker, nango: NangoSync): Promise<Employee | null> {
    const wd = worker.Worker_Data;
    const personal = wd.Personal_Data;
    const employment = wd.Employment_Data.Worker_Job_Data;
    const contact = personal.Contact_Data;
    const status = wd.Employment_Data.Worker_Status_Data;

    // Require email
    // We pick the first one
    const email = contact.Email_Address_Data && contact.Email_Address_Data.length > 0 ? contact.Email_Address_Data[0]!.Email_Address : null;
    if (!email) {
        await nango.log(`Skipping employee without email (${wd.Worker_ID})`, {
            level: 'warn'
        });
        return null;
    }

    // Require job
    // We pick the first one
    const job = employment && employment.length > 0 ? employment[0]!.Position_Data : null;
    if (!job) {
        await nango.log(`Skipping employee without job (${wd.Worker_ID})`, {
            level: 'warn'
        });
        return null;
    }

    // Require department
    // We pick the first one that has a WID
    let department: string | null = null;
    if (job.Job_Profile_Summary_Data.Job_Family_Reference) {
        for (const ref of job.Job_Profile_Summary_Data.Job_Family_Reference) {
            for (const id of ref.ID) {
                if (id.attributes['wd:type'] === 'WID' && !department) {
                    department = id.$value;
                    break;
                }
            }
        }
    }
    if (!department) {
        await nango.log(`Skipping employee without department (${wd.Worker_ID})`, {
            level: 'warn'
        });
        return null;
    }

    const address = contact.Address_Data && contact.Address_Data.length > 0 ? contact.Address_Data[0] : null;
    const countryIso = address ? address.Country_Reference.ID.find((id) => id.attributes['wd:type'] === 'ISO_3166-1_Alpha-2_Code') : null;

    const phone = contact.Phone_Data && contact.Phone_Data.length > 0 ? contact.Phone_Data[0]!.Phone_Number : null;

    const employee_number = worker.Worker_Reference.ID.find((id) => id.attributes['wd:type'] === 'Employee_ID');
    if (!employee_number) {
        await nango.log(`Skipping employee without number (${wd.Worker_ID})`, {
            level: 'warn'
        });
        return null;
    }

    const employee: Employee = {
        id: worker.Worker_Reference.ID.find((id) => id.attributes['wd:type'] === 'WID')!.$value,
        user_name: wd.User_ID,
        active: status?.Active,
        first_name: personal.Name_Data.Preferred_Name_Data.Name_Detail_Data.First_Name,
        last_name: personal.Name_Data.Preferred_Name_Data.Name_Detail_Data.Last_Name,
        email,
        role: job.Position_Title,
        department: department,
        site: job.Business_Site_Summary_Data.Location_Reference.ID.find((id) => id.attributes['wd:type'] === 'WID')!.$value,
        country: countryIso ? countryIso.$value : null,
        phone_number: phone,
        external_id: employee_number.$value
    };

    return employee;
}
