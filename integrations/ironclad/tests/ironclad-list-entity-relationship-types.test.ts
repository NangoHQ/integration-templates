import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-entity-relationship-types.js';

describe('ironclad list-entity-relationship-types tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-entity-relationship-types',
        Model: 'ActionOutput_ironclad_listentityrelationshiptypes'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
