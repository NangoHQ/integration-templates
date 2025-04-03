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

#### Best Practices for Using providerSpecific

1. **Data Mapping**: Always map standardizable fields to the core model first. Only use `providerSpecific` for data that truly doesn't fit the standard model.

2. **Documentation**: Document provider-specific fields in your integration's documentation to help developers understand what additional data is available.

3. **Type Safety**: Consider creating provider-specific TypeScript interfaces to maintain type safety when working with this data:
   ```typescript
   interface BambooHRProviderSpecific {
       employeeNumber: string;
       division?: string;
       exempt?: string;
       payRate?: string;
       payType?: string;
       payPer?: string;
       createdByUserId?: string;
   }
   ```

4. **Data Access**: When accessing `providerSpecific` data, always check for field existence to handle cases where the data might not be available:
   ```typescript
   const payRate = employee.providerSpecific?.payRate;
   const hobbies = employee.providerSpecific?.about?.hobbies ?? [];
   ```

## Provider-Specific Implementations

### BambooHR
- Uses REST API with directory endpoint for employee data
- Maps employment types to standardized enums: FULL_TIME, PART_TIME, INTERN, OTHER
- Maps employment status to ACTIVE or INACTIVE
- Handles both work and personal email addresses

### Workday
- Implements full sync with track_deletes
- Maps employment types and statuses to standardized enums
- Supports detailed location and department data
- Handles complex organizational structure
- Supports multiple phone types and addresses

### HiBob
- Includes both active and inactive employees
- Maps employment types and statuses to standardized enums
- Supports work site locations and optional address information
- Handles personal information like gender and birth date

### Gusto
- Maps employment types and statuses to standardized enums
- Supports both work and personal email addresses
- Handles optional fields like zip code and phone numbers

### Type Mapping
```typescript
function mapEmploymentType(type: string | undefined): EmploymentType {
    if (!type) return 'OTHER';
    
    switch (type.toUpperCase()) {
        case 'FULL_TIME':
            return 'FULL_TIME';
        case 'PART_TIME':
            return 'PART_TIME';
        case 'INTERN':
            return 'INTERN';
        default:
            return 'OTHER';
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

## Provider-Specific Characteristics

Each HRIS provider has unique characteristics in how they represent employee data:

### HiBob
- Rich providerSpecific property including food preferences, hobbies, and superpowers
- Detailed work location information with specific site names
- Support for multiple email types
- Custom fields for internal tracking
- Comprehensive employee profile with social data

### BambooHR
- Strong department and division hierarchy
- Employee number tracking
- Location-based custom fields
- Simple phone and email representation
- Detailed compensation information including pay rate and type
- SSN and government ID tracking

### Gusto
- Detailed onboarding status tracking
- Company UUID for multi-company support
- Version tracking for each employee record
- SSN verification status (hasSsn field)
- Support for both active and pending employees
- Multiple employment types (FULL_TIME, PART_TIME)
- Department-based organization structure
- Simple but effective manager relationship tracking

The standardized model successfully normalizes these differences while preserving provider-specific data in the providerSpecific field, allowing for consistent data access across integrations while maintaining all original information.
