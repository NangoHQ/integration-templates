import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/test-account-vitals.js';

describe('instantly test-account-vitals tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'test-account-vitals',
        Model: 'ActionOutput_instantly_testaccountvitals'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
