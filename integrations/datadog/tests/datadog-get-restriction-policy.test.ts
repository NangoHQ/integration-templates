import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-restriction-policy.js';

describe('datadog get-restriction-policy tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-restriction-policy',
        Model: 'ActionOutput_datadog_getrestrictionpolicy'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
