import { expect, it, describe } from 'vitest';

import createAction from '../actions/delete-catalog-object.js';

describe('squareup delete-catalog-object tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-catalog-object',
        Model: 'ActionOutput_squareup_deletecatalogobject'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
