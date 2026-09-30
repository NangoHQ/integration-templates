import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-account-summary.js';

describe('constant-contact update-account-summary tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-account-summary',
        Model: 'ActionOutput_constant_contact_updateaccountsummary'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
