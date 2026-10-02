import { expect, it, describe } from 'vitest';

import createAction from '../actions/subscribe-contact-to-list.js';

describe('brevo-api-key subscribe-contact-to-list tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'subscribe-contact-to-list',
        Model: 'ActionOutput_brevo_api_key_subscribecontacttolist'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
