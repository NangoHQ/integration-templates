import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/subscribe-email-to-list.js';

describe('mailgun subscribe-email-to-list tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'subscribe-email-to-list',
        Model: 'ActionOutput_mailgun_subscribeemailtolist'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
