import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-slo.js';

describe('datadog create-slo tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-slo',
        Model: 'ActionOutput_datadog_createslo'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
