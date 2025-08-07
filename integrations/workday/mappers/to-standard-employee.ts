import type { StandardEmployee, UnifiedAddress } from '../../models.js';
import type { ResponseWorkdayWorker } from '../types.js';

/**
 * Maps a Workday worker to the standardized employee model
 */
export function toStandardEmployee(worker: ResponseWorkdayWorker): StandardEmployee {
    const jobData = worker.Worker_Data.Employment_Data.Worker_Job_Data?.[0];
    const positionData = jobData?.Position_Data;
    const businessSiteData = positionData?.Business_Site_Summary_Data;
    const addressData = businessSiteData?.Address_Data?.[0];
    const contactData = worker.Worker_Data.Personal_Data.Contact_Data;
    const nameData = worker.Worker_Data.Personal_Data.Name_Data.Legal_Name_Data.Name_Detail_Data;
    const employmentData = worker.Worker_Data.Employment_Data.Worker_Status_Data;

    // Prepare the address object if data exists
    const address: UnifiedAddress | undefined = addressData
        ? {
              street: addressData.Address_Line_Data[0]?.$value || '',
              city: addressData.Municipality || '',
              state: addressData.Country_Region_Descriptor || '',
              country: addressData.Country_Reference?.ID?.[0]?.$value || '',
              postalCode: addressData.Postal_Code || '',
              type: 'WORK'
          }
        : undefined;

    const workEmail = contactData?.Email_Address_Data?.[0]?.Email_Address || '';
    const workPhone = contactData?.Phone_Data?.[0]?.Phone_Number || '';
    const title = positionData?.Position_Title || positionData?.Business_Title || undefined;

    // Extract useful job profile data
    const jobProfileData = positionData?.Job_Profile_Summary_Data;
    const jobProfile = jobProfileData
        ? {
              id: jobProfileData.Job_Profile_Reference?.ID?.[0]?.$value,
              name: jobProfileData.Job_Profile_Name,
              isExempt: jobProfileData.Job_Exempt,
              isCritical: jobProfileData.Critical_Job,
              managementLevel: jobProfileData.Management_Level_Reference?.ID?.[0]?.$value,
              jobFamily: jobProfileData.Job_Family_Reference?.[0]?.ID?.[0]?.$value
          }
        : undefined;

    return {
        id: worker.Worker_Data.Worker_ID,
        firstName: nameData.First_Name,
        lastName: nameData.Last_Name,
        email: workEmail,
        displayName: `${nameData.First_Name} ${nameData.Last_Name}`,
        employeeNumber: worker.Worker_Data.Worker_ID,
        ...(title && { title }),
        department: {
            id: positionData?.Position_ID || '',
            name: positionData?.Business_Title || ''
        },
        employmentType: 'FULL_TIME',
        employmentStatus: employmentData?.Active
            ? 'ACTIVE'
            : employmentData?.Terminated
              ? 'TERMINATED'
              : employmentData?.Leave_Status_Data?.On_Leave
                ? 'ON_LEAVE'
                : 'PENDING',
        startDate: employmentData?.Hire_Date || '',
        ...(employmentData?.End_Employment_Date && { terminationDate: employmentData.End_Employment_Date }),
        workLocation: {
            name: businessSiteData?.Name || '',
            type: 'OFFICE',
            primaryAddress: address
        },
        addresses: address ? [address] : [],
        phones: workPhone
            ? [
                  {
                      type: 'WORK',
                      number: workPhone
                  }
              ]
            : [],
        emails: workEmail
            ? [
                  {
                      type: 'WORK',
                      address: workEmail
                  }
              ]
            : [],
        providerSpecific: {
            workdayId: worker.Worker_Data.Worker_ID,
            userId: worker.Worker_Data.User_ID,
            position: {
                id: positionData?.Position_ID,
                title: positionData?.Position_Title,
                businessTitle: positionData?.Business_Title,
                scheduledWeeklyHours: positionData?.Scheduled_Weekly_Hours,
                defaultWeeklyHours: positionData?.Default_Weekly_Hours,
                fullTimeEquivalentPercentage: positionData?.Full_Time_Equivalent_Percentage,
                isExempt: positionData?.Job_Exempt
            },
            jobProfile: jobProfile,
            employment: {
                originalHireDate: employmentData?.Original_Hire_Date,
                continuousServiceDate: employmentData?.Continuous_Service_Date,
                benefitsServiceDate: employmentData?.Benefits_Service_Date,
                seniorityDate: employmentData?.Seniority_Date,
                firstDayOfWork: employmentData?.First_Day_of_Work,
                isRetired: employmentData?.Retired,
                retirementDate: employmentData?.Retirement_Date,
                expectedRetirementDate: employmentData?.Expected_Retirement_Date,
                retirementEligibilityDate: employmentData?.Retirement_Eligibility_Date
            },
            location: {
                id: businessSiteData?.Location_Reference?.ID?.[0]?.$value,
                timeProfileId: businessSiteData?.Time_Profile_Reference?.ID?.[0]?.$value,
                scheduledWeeklyHours: businessSiteData?.Scheduled_Weekly_Hours
            }
        },
        createdAt: employmentData?.Hire_Date || '',
        updatedAt: ''
    };
}
