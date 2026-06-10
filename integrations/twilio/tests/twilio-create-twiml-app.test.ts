import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-twiml-app.js';

describe('twilio create-twiml-app tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-twiml-app',
        Model: 'ActionOutput_twilio_createtwimlapp'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
