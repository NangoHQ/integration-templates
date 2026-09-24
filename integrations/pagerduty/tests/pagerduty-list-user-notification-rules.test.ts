import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-user-notification-rules.js';

describe('pagerduty list-user-notification-rules tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-user-notification-rules',
        Model: 'ActionOutput_pagerduty_listusernotificationrules'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
