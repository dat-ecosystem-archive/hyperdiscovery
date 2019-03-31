const crypto = require('crypto')

const datEncoding = require('dat-encoding')
const hypercoreProtocol = require('hypercore-protocol')
const discoverySwarm = require('discovery-swarm')
const swarmDefaults = require('dat-swarm-defaults')
const mutexify = require('mutexify')

const debug = require('debug')('hyperdiscovery')

module.exports = (...args) => new Hyperdiscovery(...args)

class Hyperdiscovery {
  constructor (opts) {
    opts = opts || {}
    this._opts = opts

    this.id = opts.id || crypto.randomBytes(32)

    this.swarm = discoverySwarm(swarmDefaults({
      id: this.id,
      hash: false,
      utp: defaultTrue(opts.utp),
      tcp: defaultTrue(opts.tcp),
      dht: defaultTrue(opts.dht),
      stream: this._createReplicationStream.bind(this)
    }))
    this.swarm.listen(opts.port || 3282)

    this._replicatingCores = new Map()
    this._lock = mutexify()
    this.streamKeys = [] // list of keys replicated over the stream
    this._stream = null
  }

  // Lightly modified from Beaker's implementation
  _createReplicationStream (info) {
    debug('_createReplicationStream')
    var self = this

    self._stream = self._stream || hypercoreProtocol({
      id: this.id,
      live: true,
      encrypt: true
    })
    self._stream.peerInfo = info

    // add the archive if the discovery network gave us any info
    if (info.channel) {
      lockedAdd(info.channel)
    }

    // add any requested archives
    self._stream.on('feed', lockedAdd)

    function lockedAdd (dkey) {
      self._lock(release => {
        self._add(dkey)
          .then(() => release())
          .catch(err => release(err))
      })
    }

    // debugging
    self._stream.on('error', err => {
      debug(self.streamKeys, {
        event: 'connection-error',
        peer: `${info.host}:${info.port}`,
        connectionType: info.type,
        message: err.toString()
      })
    })

    return self._stream
  }

  async _add (core) {
    const self = this
    const dKey = core.discoveryKey || core
    core = core || self._replicatingCores.get(dKey)

    this._replicatingCores.set(dKey, core)

    if (!core || !core.key) { // || !core.isSwarming) {
      return
    }
    const keyStr = datEncoding.toStr(core.key)

    if (!core.replicationStreams) {
      core.replicationStreams = []
    }
    if (self.streamKeys.indexOf(keyStr) !== -1) {
      return // already replicating
    }

    // create the replication stream
    var stream = core.replicate({ stream: self._stream, live: true })
    if (stream.destroyed) return null// in case the stream was destroyed during setup
    if (!self._stream) self._stream = stream

    // track the stream
    self.streamKeys.push(keyStr)
    core.replicationStreams.push(stream)
    debug('done creating stream', keyStr)

    function onend () {
      debug('onend core', core.key.toString('hex'))
      core.replicationStreams = core.replicationStreams.filter(s => (s !== stream))
      // If the Replicator is the only object with a reference to this core, close it after replication's finished.
      if (!core.replicationStreams.length) {
        self._replicatingCores.delete(keyStr)
        core.close()
      }
    }
    stream.once('error', onend)
    stream.once('end', onend)
    stream.once('close', onend)
  }

  add (core) {
    var self = this
    return new Promise((resolve, reject) => {
      self._lock(release => {
        self._add(core)
          .then(() => {
            self._join(core.discoveryKey)
            release()
            resolve(self)
          })
          .catch(err => {
            release(err)
            reject(err)
          })
      })
    })
  }

  _join (dkey) {
    this.swarm.join(dkey)
  }

  remove (key) {
    const core = this._replicatingCores.get(key)
    if (core.replicationStreams) {
      core.replicationStreams.forEach(stream => stream.destroy()) // stop all active replications
      core.replicationStreams.length = 0
    }
    this.swarm.leave(key)
  }

  async stop () {
    return new Promise((resolve, reject) => {
      this.swarm.destroy(err => {
        if (err) return reject(err)
        return resolve()
      })
    })
  }
}

function defaultTrue (x) {
  return x === undefined ? true : x
}
