import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-service-definitions.js';

describe('datadog list-service-definitions tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-service-definitions',
        Model: 'ActionOutput_datadog_listservicedefinitions'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
