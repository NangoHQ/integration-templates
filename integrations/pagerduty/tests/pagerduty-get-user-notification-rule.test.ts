import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-user-notification-rule.js';

describe('pagerduty get-user-notification-rule tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-user-notification-rule',
        Model: 'ActionOutput_pagerduty_getusernotificationrule'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
