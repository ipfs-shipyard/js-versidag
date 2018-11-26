'use strict';

const { createInMemoryVersidag } = require('./helpers/memory-versidag');

it('should resolve correctly for scenario 1', async () => {
    const versiNodeA = await createInMemoryVersidag({ timestamp: 1, cid: 'A' });

    const versiNodeB = await versiNodeA.add({ timestamp: 2, cid: 'B' });
    const versiNodeC = await versiNodeA.add({ timestamp: 3, cid: 'C' });

    const versiNodeD = await versiNodeB.merge(versiNodeC.getCid());

    const result = await versiNodeD.resolve();

    expect(result.versions).toEqual([
        { timestamp: 1, cid: 'A' },
        { timestamp: 2, cid: 'B' },
        { timestamp: 3, cid: 'C' },
    ]);

    console.log(result);
});

// it.skip('should resolve correctly for scenario 1, stateless', async () => {
//     const versidag = createInMemoryVersidag();
//
//     const versidagACid = await versidag.add({ timestamp: 1, cid: 'A' });
//     const versidagBCid = await versidag.add({ timestamp: 1, cid: 'B' }, versidagACid);
//     const versidagCCid = await versidag.add({ timestamp: 2, cid: 'C' }, versidagACid);
//
//     const versidagDCid = versidag.merge(versidagBCid, versidagCCid);
//
//     versidag.resolve(versidagDCid, { limit: 2 });
//
//     await versidag.add({ timestamp: 2, cid: 'B' });
// });

// - while await.. fazer prefetch
// - pagination no resolve
// - + testes use-cases
// - testes unitarios
// - usar es
// - wrap comparator to ensure reverse order + validate === 0
// - README.md
