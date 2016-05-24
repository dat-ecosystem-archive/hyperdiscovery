# hyperdrive-swarm

Hosts a swarm for multiple hyperdrives.

[![Travis](https://api.travis-ci.org/karissa/hyperdrive-swarm.svg)](https://travis-ci.org/karissa/hyperdrive-swarm)

## `swarm.link(dir, opts, cb)`

Create a hyperdrive archive from files in `dir`.

## `swarm.join(link, dir, opts, cb)`

Join an existing hyperdrive link and begin downloading or uploading contents in `dir`.
