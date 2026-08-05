import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-downtimes.js';

describe('datadog list-downtimes tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-downtimes',
        Model: 'ActionOutput_datadog_listdowntimes'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
