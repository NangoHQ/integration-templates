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
    metadata: Record<string, any>;

    // Audit fields
    createdAt: string;
    updatedAt: string;
}
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