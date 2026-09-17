import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-user-notification-rule.js';

describe('pagerduty delete-user-notification-rule tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-user-notification-rule',
        Model: 'ActionOutput_pagerduty_deleteusernotificationrule'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
