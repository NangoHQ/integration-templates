import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-audience.js';

describe('mailchimp update-audience tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-audience',
        Model: 'ActionOutput_mailchimp_updateaudience'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
