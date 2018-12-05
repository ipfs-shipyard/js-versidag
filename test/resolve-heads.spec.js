import createInMemoryVersidag from './helpers/memory-versidag';
import resolveHeads from '../src/resolve-heads';

it('should return the correct with just one node', async () => {
    const versidagA = await createInMemoryVersidag().add('A', 1);

    const result = await resolveHeads(
        versidagA.headCids,
        versidagA.config,
    );

    expect(result).toEqual({
        ancestorCid: null,
        headCids: versidagA.headCids,
        versionsCount: 1,
    });
});

it('should return the correct result if there\'s no common ancestor', async () => {
    const versidagA = await createInMemoryVersidag().add('A', 1);
    const versidagB = await createInMemoryVersidag().add('B', 2);

    const result = await resolveHeads(
        [...versidagA.headCids, ...versidagB.headCids],
        {
            ...versidagA.config,
            readNode: (id) =>
                versidagA.config.readNode(id)
                .then((node) => node || versidagB.config.readNode(id)),
        },
    );

    expect(result).toEqual({
        ancestorCid: null,
        headCids: [...versidagA.headCids, ...versidagB.headCids],
        versionsCount: 2,
    });
});

it('should still work correctly with two repeated heads', async () => {
    const versidagA = await createInMemoryVersidag().add('A', 1);
    const versidagB = await versidagA.add('B', 2);

    const result = await resolveHeads(
        [...versidagB.headCids, ...versidagB.headCids],
        versidagA.config,
    );

    expect(result).toEqual({
        ancestorCid: versidagA.headCids[0],
        headCids: [...versidagB.headCids, ...versidagB.headCids],
        versionsCount: 2,
    });
});

describe('scenario 1', () => {
    const versidags = {};

    beforeAll(async () => {
        versidags.A = await createInMemoryVersidag().add('A', 1);
        versidags.B = await versidags.A.add('B', 2);
        versidags.C = await versidags.A.add('C', 3);
        versidags.D = await versidags.C.merge(versidags.B.headCids);
    });

    it('should return the correct result (heads: D)', async () => {
        const result = await resolveHeads(
            versidags.D.headCids,
            versidags.A.config,
        );

        expect(result).toEqual({
            ancestorCid: versidags.A.headCids[0],
            headCids: versidags.D.headCids,
            versionsCount: 3,
        });
    });

    it('should return the correct result (heads: B, C)', async () => {
        const result = await resolveHeads(
            [...versidags.B.headCids, ...versidags.C.headCids],
            versidags.A.config,
        );

        expect(result).toEqual({
            ancestorCid: versidags.A.headCids[0],
            headCids: [...versidags.B.headCids, ...versidags.C.headCids],
            versionsCount: 3,
        });
    });

    it('should return the correct result (heads: B, D)', async () => {
        const result = await resolveHeads(
            [...versidags.B.headCids, ...versidags.D.headCids],
            versidags.A.config,
        );

        expect(result).toEqual({
            ancestorCid: versidags.A.headCids[0],
            headCids: versidags.D.headCids,
            versionsCount: 3,
        });
    });

    it('should return the correct result (heads: D, C)', async () => {
        const result = await resolveHeads(
            [...versidags.D.headCids, ...versidags.C.headCids],
            versidags.A.config,
        );

        expect(result).toEqual({
            ancestorCid: versidags.A.headCids[0],
            headCids: versidags.D.headCids,
            versionsCount: 3,
        });
    });

    it('should return the correct result (heads: A, D)', async () => {
        const result = await resolveHeads(
            [...versidags.A.headCids, ...versidags.D.headCids],
            versidags.A.config,
        );

        expect(result).toEqual({
            ancestorCid: versidags.A.headCids[0],
            headCids: versidags.D.headCids,
            versionsCount: 3,
        });
    });
});

describe('scenario 2', () => {
    const versidags = {};

    beforeAll(async () => {
        versidags.A = await createInMemoryVersidag().add('A', 1);
        versidags.B = await versidags.A.add('B', 2);
        versidags.C = await versidags.A.add('C', 3);
        versidags.D = await versidags.C.merge(versidags.B.headCids);
        versidags.E = await versidags.A.add('E', 5);
        versidags.F = await versidags.D.merge(versidags.E.headCids);
    });

    it('should return the correct result (heads: F)', async () => {
        const result = await resolveHeads(
            versidags.F.headCids,
            versidags.A.config,
        );

        expect(result).toEqual({
            ancestorCid: versidags.A.headCids[0],
            headCids: versidags.F.headCids,
            versionsCount: 4,
        });
    });
});

describe('scenario 3', () => {
    const versidags = {};

    beforeAll(async () => {
        versidags.A = await createInMemoryVersidag().add('A', 1);
        versidags.B = await versidags.A.add('B', 2);
        versidags.C = await versidags.B.add('C', 3);
        versidags.D = await versidags.B.add('D', 4);
        versidags.E = await versidags.C.merge(versidags.D.headCids);
    });

    it('should return the correct result (heads: E)', async () => {
        const result = await resolveHeads(
            versidags.E.headCids,
            versidags.A.config,
        );

        expect(result).toEqual({
            ancestorCid: versidags.A.headCids[0],
            headCids: versidags.E.headCids,
            versionsCount: 4,
        });
    });

    it('should return the correct result (heads: C, D)', async () => {
        const result = await resolveHeads(
            [...versidags.C.headCids, ...versidags.D.headCids],
            versidags.A.config,
        );

        expect(result).toEqual({
            ancestorCid: versidags.A.headCids[0],
            headCids: [...versidags.C.headCids, ...versidags.D.headCids],
            versionsCount: 4,
        });
    });
});
