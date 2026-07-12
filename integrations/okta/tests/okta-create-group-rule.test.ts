import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-group-rule.js';

describe('okta create-group-rule tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-group-rule',
        Model: 'ActionOutput_okta_cc_creategrouprule'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
