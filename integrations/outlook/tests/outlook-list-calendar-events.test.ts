import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-calendar-events.js';

describe('outlook list-calendar-events tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-calendar-events',
        Model: 'ActionOutput_outlook_listcalendarevents'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
