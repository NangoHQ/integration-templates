import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/enroll-factor.js';

describe('okta enroll-factor tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'enroll-factor',
        Model: 'ActionOutput_okta_cc_enrollfactor'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
