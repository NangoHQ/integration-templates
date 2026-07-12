import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-policy-rule.js';

describe('okta create-policy-rule tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-policy-rule',
        Model: 'ActionOutput_okta_cc_createpolicyrule'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
