import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-twiml-app.js';

describe('twilio delete-twiml-app tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-twiml-app',
        Model: 'ActionOutput_twilio_deletetwimlapp'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
