import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-entity-types.js';

describe('dynatrace list-entity-types tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-entity-types',
        Model: 'ActionOutput_dynatrace_listentitytypes'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
