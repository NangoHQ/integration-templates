import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/verify-email.js';

describe('millionverifier verify-email tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'verify-email',
        Model: 'ActionOutput_millionverifier_verifyemail'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
