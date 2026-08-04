import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-restriction-policy.js';

describe('datadog delete-restriction-policy tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-restriction-policy',
        Model: 'ActionOutput_datadog_deleterestrictionpolicy'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
