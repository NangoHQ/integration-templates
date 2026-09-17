import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-user-notification-rule.js';

describe('pagerduty update-user-notification-rule tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-user-notification-rule',
        Model: 'ActionOutput_pagerduty_updateusernotificationrule'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
