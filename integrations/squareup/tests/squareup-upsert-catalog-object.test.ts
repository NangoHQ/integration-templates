import { expect, it, describe } from 'vitest';

import createAction from '../actions/upsert-catalog-object.js';

describe('squareup upsert-catalog-object tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'upsert-catalog-object',
        Model: 'ActionOutput_squareup_upsertcatalogobject'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
