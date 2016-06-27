# hyperdrive-archive-swarm

Join a hyperdrive archive's p2p swarm in the client and server.

```
npm install hyperdrive-archive-swarm
```

## Usage

Run the following code in two different places and they will replicate the contents of the given `ARCHIVE_KEY`.

```js
var hyperdrive = require('hyperdrive')
var memdb = require('memdb')
var swarm = require('hyperdrive-archive-swarm')

var drive = hyperdrive(memdb())
var archive = drive.createArchive('ARCHIVE_KEY')

var sw = swarm(archive)
sw.on('connection', function (peer, type) {
  console.log('got', peer, type) // type is 'webrtc-swarm' or 'discovery-swarm'
  console.log('connected to', sw.connections, 'peers')
  peer.on('close', function () {
    console.log('peer disconnected')
  }) 
})
```

Will use `discovery-swarm`, and `webrtc-swarm` whenever available to attempt to connect peers. Uses `datland-swarm-defaults` for peer introduction defaults on the server side, which can be overwritten (see below).

## API

### `var sw = swarm(archive, opts)`

Join the p2p swarm for the given hyperdrive archive. The return object, `sw`, is an event emitter that will emit a `peer` event with the peer information when a peer is found.

Get number of currently active connections with ```sw.connections```.

##### Options

  * `signalhub`: the url of the signalhub.
  * `signalhubPrefix`: the prefix for the archive's signalhub key
  * `wrtc`: a webrtc instance, e.g. electron-webrtc, if not natively supported

Defaults from datland-swarm-defaults can also be overwritten:

  * `dns.server`: DNS server
  * `dns.domain`: DNS domain
  * `dht.bootstrap`: distributed hash table bootstrapping nodes
