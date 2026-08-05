import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-dashboards.js';

describe('datadog list-dashboards tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-dashboards',
        Model: 'ActionOutput_datadog_listdashboards'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
