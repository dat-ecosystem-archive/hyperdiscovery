# hyperdiscovery

[![Travis](https://api.travis-ci.org/karissa/hyperdiscovery)](https://travis-ci.org/karissa/hyperdiscovery)

Join the p2p swarm for [hypercore][core] and [hyperdrive][drive] feeds. Uses
[discovery-swarm][swarm] under the hood.

```
npm install hyperdiscovery
```

## Usage

Run the following code in two different places and they will replicate the contents of the given `ARCHIVE_KEY`.

```js
var hyperdrive = require('hyperdrive')
var swarm = require('hyperdiscovery')

var archive = hyperdrive('./database', 'ARCHIVE_KEY')
var sw = swarm(archive)
sw.on('connection', function (peer, type) {
  console.log('got', peer, type) 
  console.log('connected to', sw.connections.length, 'peers')
  peer.on('close', function () {
    console.log('peer disconnected')
  })
})
```

Will use `discovery-swarm` to attempt to connect peers. Uses `datland-swarm-defaults` for peer introduction defaults on the server side, which can be overwritten (see below).

The module can also create and join a swarm for a hypercore feed:

```js
var hypercore = require('hypercore')
var swarm = require('hyperdiscovery')

var feed = hypercore('/feed')
var sw = swarm(feed)
```

## API

### `var sw = swarm(archive, opts)`

Join the p2p swarm for the given feed. The return object, `sw`, is an event emitter that will emit a `peer` event with the peer information when a peer is found.

### sw.connections

Get the list of currently active connections.

### sw.close()

Exit the swarm

##### Options

  * `stream`: function, replication stream for connection. Default is `archive.replicate({live, upload, download})`.
  * `upload`: bool, upload data to the other peer?
  * `download`: bool, download data from the other peer?
  * `port`: port for discovery swarm
  * `utp`: use utp in discovery swarm
  * `tcp`: use tcp in discovery swarm

Defaults from datland-swarm-defaults can also be overwritten:

  * `dns.server`: DNS server
  * `dns.domain`: DNS domain
  * `dht.bootstrap`: distributed hash table bootstrapping nodes

## See Also
- [mafintosh/hypercore][core]
- [mafintosh/hyperdrive][drive]
- [mafintosh/discovery-swarm][swarm]

## License
ISC

[core]: https://github.com/mafintosh/hypercore
[drive]: https://github.com/mafintosh/hyperdrive
[swarm]: https://github.com/mafintosh/discovery-swarm
