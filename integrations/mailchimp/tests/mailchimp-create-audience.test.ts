import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-audience.js';

describe('mailchimp create-audience tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-audience',
        Model: 'ActionOutput_mailchimp_createaudience'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
