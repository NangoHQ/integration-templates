# HRIS Integration Unification

This document analyzes how different HRIS (Human Resource Information System) integrations are unified in our platform, focusing on employee data synchronization. We'll examine the commonalities and differences between various HRIS providers and identify areas for improvement in our unification strategy.

## Standardized Employee Model

We've implemented a standardized employee model that all HRIS integrations map to. This ensures consistent data structure and field naming across all providers.

### Core Employee Model

```typescript
interface StandardEmployee {
    // Core fields
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    displayName: string;
    employeeNumber?: string;

    // Employment details
    title: string;
    department: {
        id: string;
        name: string;
    };
    employmentType: 'FULL_TIME' | 'PART_TIME' | 'CONTRACTOR' | 'INTERN' | 'TEMPORARY' | 'OTHER';
    employmentStatus: 'ACTIVE' | 'TERMINATED' | 'ON_LEAVE' | 'SUSPENDED' | 'PENDING';
    startDate: string;  // ISO date
    terminationDate?: string;  // ISO date
    manager?: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
    };
    workLocation: {
        name: string;
        type: 'OFFICE' | 'REMOTE' | 'HYBRID';
        primaryAddress?: {
            street: string;
            city: string;
            state: string;
            country: string;
            postalCode: string;
            type: 'WORK' | 'HOME';
        };
    };

    // Personal details
    addresses: Array<{
        street: string;
        city: string;
        state: string;
        country: string;
        postalCode: string;
        type: 'HOME' | 'WORK';
    }>;
    phones: Array<{
        type: 'WORK' | 'HOME' | 'MOBILE';
        number: string;
    }>;
    emails: Array<{
        type: 'WORK' | 'PERSONAL';
        address: string;
    }>;

    // Provider-specific data
    providerSpecific: Record<string, any>;

    // Audit fields
    createdAt: string;
    updatedAt: string;
}
```

### Provider-Specific Data Field

The `providerSpecific` field is a crucial part of our standardized employee model that serves multiple important purposes:

1. **Data Preservation**: It stores provider-specific fields that don't map directly to our standardized model but might be valuable for specific use cases. This ensures no data is lost during the standardization process.

2. **Flexibility**: Different HRIS providers often have unique fields or data structures that are important to their specific implementations. The `providerSpecific` field allows us to maintain these unique attributes while still providing a consistent interface.

3. **Extended Functionality**: It enables applications to access provider-specific features or data when needed, while still maintaining the benefits of standardization for common operations.

Examples of provider-specific data include:

- **BambooHR**:
  ```typescript
  providerSpecific: {
      employeeNumber: "123",
      division: "North America",
      exempt: "Exempt",
      payRate: "65000.00 USD",
      payType: "Salary",
      payPer: "Year",
      createdByUserId: "admin123"
  }
  ```

- **HiBob**:
  ```typescript
  providerSpecific: {
      customFields: {
          employeeId: "EMP123",
          costCenter: "CC456"
      },
      about: {
          foodPreferences: ["vegetarian"],
          superpowers: ["problem-solving"],
          hobbies: ["reading", "hiking"]
      }
  }
  ```

- **Gusto**:
  ```typescript
  providerSpecific: {
      uuid: "ebb602e4-****-****-****-f196b4227127",
      companyUuid: "55dcda7f-b9d5-4088-ba5a-3388b20b12e5",
      version: "6d9345917e71d3f8f00b69de04d83f38",
      onboardingStatus: "onboarding_completed",
      customFields: []
  }
  ```

- **Workday**:
  ```typescript
  providerSpecific: {
      workdayId: "21099",
      userId: "jclark",
      position: {
          id: "P-00114",
          title: "Program Manager",
          businessTitle: "Program Manager",
          scheduledWeeklyHours: 40,
          defaultWeeklyHours: 40,
          fullTimeEquivalentPercentage: 100,
          isExempt: true
      },
      jobProfile: {
          id: "d588d86df2f241aca0985ce5c0e7a09b",
          name: "Program Manager",
          isExempt: true,
          isCritical: false,
          managementLevel: "7a379eea3b0c4a10a2b50663b2bd15e4",
          jobFamily: "25177fb82ead433ba46a27f9d787de56"
      },
      employment: {
          originalHireDate: "2000-01-01T00:00:00.000Z",
          continuousServiceDate: "2000-01-01T00:00:00.000Z",
          seniorityDate: "2000-01-01T00:00:00.000Z",
          firstDayOfWork: "2000-01-01T00:00:00.000Z",
          isRetired: false
      },
      location: {
          id: "d13a7c46a06443c4a33c09afbdf72c73",
          timeProfileId: "e57d85ad0fed4ff390953935e2873466",
          scheduledWeeklyHours: 40
      }
  }
  ```

## Example Unified Output

Below is an example of how employee data from different HRIS providers is mapped to our standardized model. The data has been obfuscated for privacy.

### HiBob Example

```typescript
{
    // Core fields
    id: "2780435851******286",
    firstName: "John",
    lastName: "Smith",
    email: "john@company.com",
    displayName: "John Smith",

    // Employment details
    title: "Senior Product Manager",
    department: {
        id: "dept_123",
        name: "Product"
    },
    employmentType: "FULL_TIME",
    employmentStatus: "ACTIVE",
    startDate: "2022-01-01",
    manager: {
        id: "2780435851******178",
        firstName: "Jane",
        lastName: "Doe",
        email: "jane@company.com"
    },
    workLocation: {
        name: "HQ",
        type: "HYBRID",
        primaryAddress: {
            street: "123 Main St",
            city: "San Francisco",
            state: "CA",
            country: "USA",
            postalCode: "94105",
            type: "WORK"
        }
    },

    // Personal details
    addresses: [
        {
            street: "456 Park Ave",
            city: "San Francisco",
            state: "CA",
            country: "USA",
            postalCode: "94103",
            type: "HOME"
        }
    ],
    phones: [
        {
            type: "WORK",
            number: "+1 (555) 123-4567"
        },
        {
            type: "MOBILE",
            number: "+1 (555) 987-6543"
        }
    ],
    emails: [
        {
            type: "WORK",
            address: "john@company.com"
        },
        {
            type: "PERSONAL",
            address: "john.smith@gmail.com"
        }
    ],

    // Provider-specific data
    providerSpecific: {
        customFields: {
            employeeId: "EMP123",
            costCenter: "CC456"
        },
        about: {
            foodPreferences: ["vegetarian"],
            superpowers: ["problem-solving", "communication"],
            hobbies: ["reading", "hiking"]
        }
    },

    // Audit fields
    createdAt: "2022-01-01T00:00:00Z",
    updatedAt: "2023-12-31T23:59:59Z"
}
```

This example demonstrates how raw provider data is transformed into our standardized model while preserving provider-specific information in the providerSpecific field. The standardization ensures consistent field names and data structures across all HRIS integrations while maintaining the flexibility to store provider-specific details.

### BambooHR Example

```typescript
{
    // Core fields
    id: "4",
    firstName: "Charlotte",
    lastName: "Abbott",
    email: "c******@efficientoffice.com",
    displayName: "Charlotte Abbott",

    // Employment details
    title: "Sr. HR Administrator",
    department: {
        id: "hr_dept",
        name: "Human Resources"
    },
    employmentType: "FULL_TIME",
    employmentStatus: "ACTIVE",
    startDate: "2023-12-28",
    manager: {
        id: "6",
        firstName: "Jennifer",
        lastName: "Caldwell",
        email: "j******@efficientoffice.com"
    },
    workLocation: {
        name: "Lindon, Utah",
        type: "OFFICE",
        primaryAddress: {
            street: "335 S 560 W",
            city: "Lindon",
            state: "Utah",
            country: "United States",
            postalCode: "84042",
            type: "WORK"
        }
    },

    // Personal details
    addresses: [
        {
            street: "335 S 560 W",
            city: "Lindon",
            state: "Utah",
            country: "United States",
            postalCode: "84042",
            type: "HOME"
        }
    ],
    phones: [
        {
            type: "WORK",
            number: "801-724-****"
        },
        {
            type: "HOME",
            number: "801-724-****"
        }
    ],
    emails: [
        {
            type: "WORK",
            address: "c******@efficientoffice.com"
        }
    ],

    // Provider-specific data
    providerSpecific: {
        employeeNumber: "1",
        division: "North America",
        employmentHistoryStatus: "Full-Time",
        gender: "Female",
        exempt: "Exempt",
        payRate: "65000.00 USD",
        payType: "Salary",
        payPer: "Year",
        ssn: "***-**-8712",
        dateOfBirth: "1997-04-07"
    },

    // Audit fields
    createdAt: "2023-12-28T00:00:00Z",
    updatedAt: "2024-03-01T12:00:00Z"
}
```

### Gusto Example

```typescript
{
    // Core fields
    id: "ebb602e4-****-****-****-f196b4227127",
    firstName: "Isaiah",
    lastName: "Berlin",
    email: "i******@initech.biz",
    displayName: "Isaiah Berlin",

    // Employment details
    title: "Client Support Manager",
    department: {
        id: "92cbc437-fa19-491c-ae72-3ee079c75dd8",
        name: "Sales"
    },
    employmentType: "PART_TIME",
    employmentStatus: "ACTIVE",
    startDate: "2023-10-17",
    manager: {
        id: "0d72dfdf-5a12-4745-bdc9-9ab8727f8586",
        firstName: "Soren",
        lastName: "Kierkegaard",
        email: "k******@initech.biz"
    },
    workLocation: {
        name: "Unknown",
        type: "HYBRID",
        primaryAddress: {
            type: "WORK"
        }
    },

    // Personal details
    addresses: [],
    phones: [],
    emails: [
        {
            type: "WORK",
            address: "i******@initech.biz"
        }
    ],

    // Provider-specific data
    providerSpecific: {
        uuid: "ebb602e4-****-****-****-f196b4227127",
        companyUuid: "55dcda7f-b9d5-4088-ba5a-3388b20b12e5",
        version: "6d9345917e71d3f8f00b69de04d83f38",
        onboardingStatus: "onboarding_completed",
        dateOfBirth: "2004-10-17",
        hasSsn: true,
        customFields: []
    },

    // Audit fields
    createdAt: "2025-04-03T09:15:13.589Z",
    updatedAt: "2025-04-03T09:15:13.589Z"
}
```

### Workday Example

```typescript
{
    // Core fields
    id: "21099",
    firstName: "Jack",
    lastName: "Clark",
    email: "jclark@workday.net",
    displayName: "Jack Clark",
    employeeNumber: "21099",

    // Employment details
    title: "Program Manager",
    department: {
        id: "P-00114",
        name: "Program Manager"
    },
    employmentType: "FULL_TIME",
    employmentStatus: "ACTIVE",
    startDate: "2000-01-01T00:00:00.000Z",
    workLocation: {
        name: "San Francisco",
        type: "OFFICE",
        primaryAddress: {
            street: "3935 The Embarcadero",
            city: "San Francisco",
            state: "California",
            country: "bc33aa3152ec42d4995f4791a106ed09",
            postalCode: "94111",
            type: "WORK"
        }
    },

    // Personal details
    addresses: [
        {
            street: "3935 The Embarcadero",
            city: "San Francisco",
            state: "California",
            country: "bc33aa3152ec42d4995f4791a106ed09",
            postalCode: "94111",
            type: "WORK"
        }
    ],
    phones: [
        {
            type: "WORK",
            number: "510363-8724"
        }
    ],
    emails: [
        {
            type: "WORK",
            address: "jclark@workday.net"
        }
    ],

    // Provider-specific data
    providerSpecific: {
        workdayId: "21099",
        userId: "jclark",
        position: {
            id: "P-00114",
            title: "Program Manager",
            businessTitle: "Program Manager",
            scheduledWeeklyHours: 40,
            defaultWeeklyHours: 40,
            fullTimeEquivalentPercentage: 100,
            isExempt: true
        },
        jobProfile: {
            id: "d588d86df2f241aca0985ce5c0e7a09b",
            name: "Program Manager",
            isExempt: true,
            isCritical: false,
            managementLevel: "7a379eea3b0c4a10a2b50663b2bd15e4",
            jobFamily: "25177fb82ead433ba46a27f9d787de56"
        },
        employment: {
            originalHireDate: "2000-01-01T00:00:00.000Z",
            continuousServiceDate: "2000-01-01T00:00:00.000Z",
            seniorityDate: "2000-01-01T00:00:00.000Z",
            firstDayOfWork: "2000-01-01T00:00:00.000Z",
            isRetired: false
        },
        location: {
            id: "d13a7c46a06443c4a33c09afbdf72c73",
            timeProfileId: "e57d85ad0fed4ff390953935e2873466",
            scheduledWeeklyHours: 40
        }
    },

    // Audit fields
    createdAt: "2000-01-01T00:00:00.000Z",
    updatedAt: "2025-04-21T19:22:51.689Z"
}
```

This example demonstrates how raw provider data is transformed into our standardized model while preserving provider-specific information in the providerSpecific field. The standardization ensures consistent field names and data structures across all HRIS integrations while maintaining the flexibility to store provider-specific details.
