import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-api-key.js';

describe('twilio get-api-key tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-api-key',
        Model: 'ActionOutput_twilio_getapikey'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
