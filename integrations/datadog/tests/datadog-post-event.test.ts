import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/post-event.js';

describe('datadog post-event tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'post-event',
        Model: 'ActionOutput_datadog_postevent'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
