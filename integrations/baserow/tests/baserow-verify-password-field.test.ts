import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/verify-password-field.js';

describe('baserow verify-password-field tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'verify-password-field',
        Model: 'ActionOutput_baserow_verifypasswordfield'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
