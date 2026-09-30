import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/bulk-delete-issues.js';

describe('sentry bulk-delete-issues tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'bulk-delete-issues',
        Model: 'ActionOutput_sentry_bulkdeleteissues'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
