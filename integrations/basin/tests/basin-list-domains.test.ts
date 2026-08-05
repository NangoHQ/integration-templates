import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-domains.js';

describe('basin list-domains tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-domains',
        Model: 'ActionOutput_basin_listdomains'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
