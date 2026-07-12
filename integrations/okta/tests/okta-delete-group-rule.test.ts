import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-group-rule.js';

describe('okta delete-group-rule tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-group-rule',
        Model: 'ActionOutput_okta_cc_deletegrouprule'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
