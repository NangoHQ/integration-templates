import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-downtime.js';

describe('datadog create-downtime tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-downtime',
        Model: 'ActionOutput_datadog_createdowntime'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
