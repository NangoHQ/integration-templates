import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-case.js';

describe('datadog create-case tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-case',
        Model: 'ActionOutput_datadog_createcase'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
