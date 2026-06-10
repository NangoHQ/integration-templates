import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-incoming-phone-numbers.js';

describe('twilio list-incoming-phone-numbers tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-incoming-phone-numbers',
        Model: 'ActionOutput_twilio_listincomingphonenumbers'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
