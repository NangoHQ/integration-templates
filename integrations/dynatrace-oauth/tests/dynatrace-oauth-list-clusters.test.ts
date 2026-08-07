import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-clusters.js';

describe('dynatrace-oauth list-clusters tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-clusters',
        Model: 'ActionOutput_dynatrace_oauth_listclusters'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
