# hyperdiscovery

[![build status](https://travis-ci.org/datproject/hyperdiscovery.svg?branch=master)](http://travis-ci.org/datproject/hyperdiscovery)

Join the p2p swarm for [hypercore][core] and [hyperdrive][drive]. Uses
[discovery-swarm][swarm] under the hood. Also works in web browsers using [discovery-swarm-web](https://github.com/RangerMauve/discovery-swarm-web).

```
npm install hyperdiscovery
```

## Usage

Run the following code in two different places and they will replicate the contents of the given `ARCHIVE_KEY`.

```js
var hyperdrive = require('hyperdrive')
var hypercore = require('hypercore')
var Discovery = require('hyperdiscovery')

var archive = hyperdrive('./database', 'ARCHIVE_KEY')
var discovery = Discovery(archive)
discovery.on('connection', function (peer, type) {
  console.log('got', peer, type)
  console.log('connected to', discovery.connections, 'peers')
  peer.on('close', function () {
    console.log('peer disconnected')
  })
})

// add another archive/feed later
var feed = hypercore('./feed')
discovery.add(feed) // adds this hypercore feed to the same discovery swarm
```

Will use `discovery-swarm` to attempt to connect peers. Uses `dat-swarm-defaults` for peer introduction defaults on the server side, which can be overwritten (see below).

The module can also create and join a swarm for a hypercore feed:

```js
var hypercore = require('hypercore')
var Discovery = require('hyperdiscovery')

var feed = hypercore('/feed')
var discovery = Discovery(feed)
```

## API

### `var discovery = Discovery(archive, opts)`

Join the p2p swarm for the given feed. The return object, `discovery`, is an event emitter that will emit a `peer` event with the peer information when a peer is found.

### `discovery.add(archive)`

Add an archive/feed to the discovery swarm.

### `discovery.totalConnections`

Get length of the list of total active connections, across all archives and feeds.

### `discovery.leave(discoveryKey)`

Leave discovery for a specific discovery key.

### `discovery.rejoin(discoveryKey)`

Rejoin discovery for a discovery key (*must be added first using `discovery.add`).

### `discovery.close()`

Exit the swarm, close all replication streams.

##### Options

  * `stream`: function, replication stream for connection. Default is `archive.replicate({live, upload, download})`.
  * `upload`: bool, upload data to the other peer?
  * `download`: bool, download data from the other peer?
  * `port`: port for discovery swarm
  * `utp`: use utp in discovery swarm
  * `tcp`: use tcp in discovery swarm
  * `signalhub`: string, WebRTC signalhub server for web
  * `discovery`: string, discovery-swarm-stream server for web

Defaults from datland-swarm-defaults can also be overwritten:

  * `dns.server`: DNS server
  * `dns.domain`: DNS domain
  * `dht.bootstrap`: distributed hash table bootstrapping nodes

## See Also
- [mafintosh/hypercore][core]
- [mafintosh/hyperdrive][drive]
- [mafintosh/hyperdb][db]
- [mafintosh/discovery-swarm][swarm]
- [discovery-swarm-web][swarm-web]

## License
ISC

[core]: https://github.com/mafintosh/hypercore
[drive]: https://github.com/mafintosh/hyperdrive
[db]: https://github.com/mafintosh/hyperdb
[swarm]: https://github.com/mafintosh/discovery-swarm
[swarm-web]: https://github.com/RangerMauve/discovery-swarm-web
