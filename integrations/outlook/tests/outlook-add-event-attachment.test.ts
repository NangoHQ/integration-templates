import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/add-event-attachment.js';

describe('outlook add-event-attachment tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'add-event-attachment',
        Model: 'ActionOutput_outlook_addeventattachment'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
