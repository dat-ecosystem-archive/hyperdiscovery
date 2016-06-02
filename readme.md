# hyperdrive-archive-swarm

Join a hyperdrive archive's swarm.

[![Travis](https://api.travis-ci.org/karissa/hyperdrive-swarm.svg)](https://travis-ci.org/karissa/hyperdrive-swarm)

### `swarm(archive, opts)`

Join the p2p swarm for the given hyperdrive archive.

##### Options

  * `SIGNALHUB_URL`: the url of the signalhub.
  * `SWARM_KEY`: the prefix for the archive's key

Defaults from datland-swarm-defaults can also be overwritten:

  * `dns.server`: DNS server
  * `dns.domain`: DNS domain
  * `dht.bootstrap`: distributed hash table bootstrapping nodes
