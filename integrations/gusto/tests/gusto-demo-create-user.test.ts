import { vi, expect, it, describe } from 'vitest';

import runAction from '../actions/create-employee.js';

describe('gusto-demo create-user tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-user',
        Model: 'User'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await runAction(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
