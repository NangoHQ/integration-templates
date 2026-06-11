import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-twiml-app.js';

describe('twilio get-twiml-app tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-twiml-app',
        Model: 'ActionOutput_twilio_gettwimlapp'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
