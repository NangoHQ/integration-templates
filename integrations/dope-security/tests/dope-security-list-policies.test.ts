import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-policies.js';

describe('dope-security list-policies tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-policies',
        Model: 'ActionOutput_dope_security_listpolicies'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
