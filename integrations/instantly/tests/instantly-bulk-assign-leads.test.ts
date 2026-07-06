import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/bulk-assign-leads.js';

describe('instantly bulk-assign-leads tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'bulk-assign-leads',
        Model: 'ActionOutput_instantly_bulkassignleads'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
