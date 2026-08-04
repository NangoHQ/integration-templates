import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-compliance-master.js';

describe('connectsecure get-compliance-master tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-compliance-master',
        Model: 'ActionOutput_connectsecure_getcompliancemaster'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
