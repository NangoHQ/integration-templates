import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-calendar.js';

describe('outlook create-calendar tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-calendar',
        Model: 'ActionOutput_outlook_createcalendar'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
