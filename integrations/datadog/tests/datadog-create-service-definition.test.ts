import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-service-definition.js';

describe('datadog create-service-definition tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-service-definition',
        Model: 'ActionOutput_datadog_createservicedefinition'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
