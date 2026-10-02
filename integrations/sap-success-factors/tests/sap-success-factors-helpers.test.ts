import { expect, it, describe } from 'vitest';

import { assertFilterPathsExpanded, buildModifiedAfterFilter } from '../helpers/utils.js';

describe('sap-success-factors buildModifiedAfterFilter', () => {
    const watermark = new Date('2019-09-07T17:04:37.000Z');

    it('should emit a single inclusive clause for the parent entity', () => {
        expect(buildModifiedAfterFilter(['lastModifiedDateTime'], watermark)).toBe(
            "lastModifiedDateTime ge datetime'2019-09-07T17:04:37.000Z'"
        );
    });

    it('should join every watched path with "or"', () => {
        expect(buildModifiedAfterFilter(['lastModifiedDateTime', 'personalInfoNav/lastModifiedDateTime'], watermark)).toBe(
            "lastModifiedDateTime ge datetime'2019-09-07T17:04:37.000Z'" +
                " or personalInfoNav/lastModifiedDateTime ge datetime'2019-09-07T17:04:37.000Z'"
        );
    });

    it('should use ge rather than gt so records on the watermark are re-read', () => {
        const filter = buildModifiedAfterFilter(['lastModifiedDateTime'], watermark);
        expect(filter).not.toContain('gt ');
        expect(filter).toContain(' ge ');
    });

    it('should normalize the watermark to ISO 8601', () => {
        expect(buildModifiedAfterFilter(['lastModifiedDateTime'], new Date('2024-06-06T14:04:37.000Z'))).toContain(
            "datetime'2024-06-06T14:04:37.000Z'"
        );
    });

    it('should produce deep nav clauses for multi-segment paths', () => {
        const paths = ['lastModifiedDateTime', 'employmentNav/compInfoNav/employmentNav/jobInfoNav/lastModifiedDateTime'];
        expect(buildModifiedAfterFilter(paths, watermark)).toBe(
            "lastModifiedDateTime ge datetime'2019-09-07T17:04:37.000Z'" +
                " or employmentNav/compInfoNav/employmentNav/jobInfoNav/lastModifiedDateTime ge datetime'2019-09-07T17:04:37.000Z'"
        );
    });
});

describe('sap-success-factors assertFilterPathsExpanded', () => {
    it('should accept a parent-only filter with no $expand', () => {
        expect(() => assertFilterPathsExpanded(['lastModifiedDateTime'], '')).not.toThrow();
    });

    it('should accept a nav path that is present in $expand', () => {
        expect(() => assertFilterPathsExpanded(['lastModifiedDateTime', 'personalInfoNav/lastModifiedDateTime'], 'personalInfoNav')).not.toThrow();
    });

    it('should accept a deep nav path whose root segment is expanded', () => {
        const expand = 'personalInfoNav,employmentNav/compInfoNav/employmentNav/jobInfoNav/locationNav';
        expect(() => assertFilterPathsExpanded(['employmentNav/compInfoNav/employmentNav/jobInfoNav/locationNav/lastModifiedDateTime'], expand)).not.toThrow();
    });

    it('should throw when a watched nav property is missing from $expand', () => {
        expect(() => assertFilterPathsExpanded(['lastModifiedDateTime', 'personalInfoNav/lastModifiedDateTime'], 'emailNav')).toThrow(
            /personalInfoNav/
        );
    });

    it('should tolerate whitespace after commas in $expand', () => {
        expect(() => assertFilterPathsExpanded(['personalInfoNav/lastModifiedDateTime', 'emailNav/lastModifiedDateTime'], 'personalInfoNav, emailNav')).not.toThrow();
    });

    it('should report every missing nav property, not just the first', () => {
        expect(() =>
            assertFilterPathsExpanded(['personalInfoNav/lastModifiedDateTime', 'phoneNav/lastModifiedDateTime', 'emailNav/lastModifiedDateTime'], 'emailNav')
        ).toThrow(/personalInfoNav, phoneNav/);
    });
});
