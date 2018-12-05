# versidag

[![NPM version][npm-image]][npm-url] [![Downloads][downloads-image]][npm-url] [![Build Status][travis-image]][travis-url] [![Coverage Status][codecov-image]][codecov-url] [![Dependency status][david-dm-image]][david-dm-url] [![Dev Dependency status][david-dm-dev-image]][david-dm-dev-url]

[npm-url]:https://npmjs.org/package/versidag
[downloads-image]:http://img.shields.io/npm/dm/versidag.svg
[npm-image]:http://img.shields.io/npm/v/versidag.svg
[travis-url]:https://travis-ci.org/ipfs-shipyard/js-versidag
[travis-image]:http://img.shields.io/travis/ipfs-shipyard/js-versidag/master.svg
[codecov-url]:https://codecov.io/gh/ipfs-shipyard/js-versidag
[codecov-image]:https://img.shields.io/codecov/c/github/ipfs-shipyard/js-versidag/master.svg
[david-dm-url]:https://david-dm.org/ipfs-shipyard/js-versidag
[david-dm-image]:https://img.shields.io/david/ipfs-shipyard/js-versidag.svg
[david-dm-dev-url]:https://david-dm.org/ipfs-shipyard/js-versidag?type=dev
[david-dm-dev-image]:https://img.shields.io/david/dev/ipfs-shipyard/js-versidag.svg

Concurrent version history based on a Merkle-DAG.


## Motivation

In distributed systems, the replicas' clocks aren't reliable to get the total order of versions. This is specially true in p2p networks where the difference in clocks may be exacerbated. There are alternative ways to preserve causality: [Lamport timestamps](https://en.wikipedia.org/wiki/Lamport_timestamps), [Vector clocks](https://en.wikipedia.org/wiki/Vector_clock) or [DAGs](https://en.wikipedia.org/wiki/Directed_acyclic_graph) to name a few.

This module uses [M]erkle-DAGs](https://en.wikipedia.org/wiki/Merkle_tree) to preserve causality (happen-before) and a tie-breaker to determine the order of concurrent versions. The replicas convergency is guaranteed because:

- The nodes on a Merkle-DAGs are labeled based on their contents meaning that whenever a merge occurs, they converge to the same label (id)
- The tie-breaker is deterministic among replicas meaning that the total order of versions will be the same among replicas


## Installation

```sh
$ npm install versidag
```


## Usage

```js
const createVersidag = require('versidag');

const myVersidag = createVersidag({
    comparator: (node1, node2) => /* */,
    readNode: (cid) => /* */,
    writeNode: (node) => /* */,
});

const myVersidagA = await myVersidag.add('Hi', 1);
const myVersidagB = await myVersidagA.add('Hello', 2);
const myVersidagC = await myVersidagA.add('Hi World', 3);
const myVersidagD = await myVersidagB.merge(myVersidagC.headCids, 'Hello World');

const versions = await myVersidagD.resolve();
// [
//   { version: 'Hello world' },
//   { version: 'Hi World', meta: 3 }
//   { version: 'Hello', meta: 2 }
//   { version: 'Hi', meta: 1 }
// ]
```

## API

### createVersidag([headCids], config)

Creates a versidag instance with the specified heads.

If no `headCids` are supplied it means that it will be headless.
The config is an object that looks like this:

```js
{
    // Writes a node, returning its content id
    // This function may return a promise
    writeNode: (node) => <nodeCid>
    // Reads a node by its content id
    // This function may return a promise
    readNode: (cid) => <node>
    // A tie-breaker for concurrent nodes
    // This is a comparator that must return -1, 1 or 0
    tieBreaker: (node1, node2) => <number>
    // The maximum concurrent readNode calls, defaults to Infinity
    concurrency: 10,
}
```

**Important considerations**:

- The return of `writeNode` must be based on the `node` contents meaning that it should produce that **same result** for the same `node`, even across replicas. This is often called a content id, or [`cid`](https://github.com/ipld/cid). 
- The `tieBreaker` result must be **consistent** across replicas, that is, for the same arguments it should return exactly the same result in all the replicas. In essence it should be a the same [pure function](https://en.wikipedia.org/wiki/Pure_function) in all replicas.

Example:

```js
import hashObj from 'hash-obj';

const nodesMap = new Map();

// Example of a in-memory versidag where the tie-breaker is
// a simple meta comparison
const versidag = createVersidag({
    writeNode: (node) => {
        // The hash-obj module returns an hash of the object
        const cid = hashObj(node)

        nodesMap.set(cid, node);

        return cid;
    },
    readNode: (cid) => nodesMap.get(cid),
    tieBreaker: (node1, node2) => node1.meta - node2.meta
});
```

### .headCids

A getter for the underlying DAG heads content ids.

### .config

A getter for the underlying config

### .add(version, meta)

Adds a new `version` with the supplied `meta`, creating a new DAG node pointing to the current heads.

Returns a promise that resolves to a new versidag pointing to the new head.

Example:

```js
const createVersidag = require('versidag');

const myVersidagA = await myVersidag.add('Hi', 1);
```

### .union(headCids)

Concatenates the current heads with the supplied `headCids`.

Any duplicate heads are removed and the final heads will be sorted lexically.   
Returns a new versidag pointing to the concatenated heads.

Note that no new DAG node will be written.

Example:

```js
const myVersidagA = await myVersidag.add('Hi', 1);
const myVersidagB = await myVersidagA.add('Hello', 2);
const myVersidagC = await myVersidagA.add('Hi World', 3);

const myVersidagD = await myVersidagB.union(myVersidagC.headCids);
// myVersidagD heads are ['B', 'C']
```

### .merge(headCids, [version])

Creates a new DAG node pointing to the union of the current heads with the supplied `headCids`, optionally pointing to a `version`.

In case you specify a `version`, it's important the it's result is consistent across the replicas as well.
This means that the replicas must converge to the same version. The way the convergence happens is agnostic to this module, but one possible solution is to use [CRDTs](https://en.wikipedia.org/wiki/Conflict-free_replicated_data_type).

Any duplicate heads are removed and the final heads will be sorted lexically.   
Moreover, any non-concurrent heads will be removed so that the result is deterministic among replicas.

Returns a new versidag pointing to the concatenated heads.

Example:

```js
const myVersidagA = await myVersidag.add('Hi', 1);
const myVersidagB = await myVersidagA.add('Hello', 2);
const myVersidagC = await myVersidagA.add('Hi World', 3);

const myVersidagD = await myVersidagB.merge(myVersidagC.headCids);

// myVersidagD points to a head that is a merge between B and C
```

### .resolve([options])

Resolves the versions by traversing the DAG.

Available options:

- `limit`: The maximum number of versions to retrieve, defaults to `Infinity`
- `fromCids`: Start the traversal from these heads instead of the current ones, used for pagination

Returns an object containing the `versions`. If `limit` was specified, the object also contains the `nextCids` that may be used for the next iteration.

If you don't need to fetch all the versions, you should specific a `limit`.
This ensures that the traversal will stop as soon as possible.

Example:

```js
const versidag = await createVersidag(['D']);

const myVersidagA = await myVersidag.add('Hi', 1);
const myVersidagB = await myVersidagA.add('Hello', 2);
const myVersidagC = await myVersidagA.add('Hi World', 3);
const myVersidagD = await myVersidagB.merge(myVersidagC.headCids, 'Hello World');

const result1 = await versidag.resolve();
// {
//   versions:[
//     { version: 'Hello world' },
//     { version: 'Hi World', meta: 3 }
//     { version: 'Hello', meta: 2 }
//     { version: 'Hi', meta: 1 }
//   ],
//   nextCids: [],
// }

// With pagination
const result1 = await versidag.resolve({ limit: 2 });
// {
//   versions:[
//     { version: 'Hello world' },
//     { version: 'Hi World', meta: 3 }
//   ],
//   nextCids: ['B', 'A'],
// }

const result2 = versidag.resolve({ limit: 2, fromCids: result1.nextCids });
// {
//   versions:[
//     { version: 'Hello', meta: 2 },
//     { version: 'Hi', meta: 1 }
//   ],
//   nextCids: ['B', 'A'],
// }
```


## Tests

`$ npm test`   
`$ npm test -- --watch` during development


## License

Released under the [MIT License](http://www.opensource.org/licenses/mit-license.php).
