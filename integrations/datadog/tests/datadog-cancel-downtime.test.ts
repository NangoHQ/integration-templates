import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/cancel-downtime.js';

describe('datadog cancel-downtime tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'cancel-downtime',
        Model: 'ActionOutput_datadog_canceldowntime'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
