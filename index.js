const crypto = require('crypto')
const EventEmitter = require('events')

const datEncoding = require('dat-encoding')
const hypercoreProtocol = require('hypercore-protocol')
const discoverySwarm = require('discovery-swarm')
const swarmDefaults = require('dat-swarm-defaults')

const debug = require('debug')('hyperdiscovery')

module.exports = (...args) => new Hyperdiscovery(...args)

const DEFAULT_PORTS = [3282, 3000, 3002, 3004, 2001, 2003, 2005]

class Hyperdiscovery extends EventEmitter {
  // Modified from Beaker Browser, copyright Blue Link Labs:
  //    https://github.com/beakerbrowser/beaker-core/
  //    https://github.com/beakerbrowser/dat-node
  // And Core Store, copyright Andrew Osheroff:
  //    https://github.com/andrewosh/corestore

  constructor (feed, opts) {
    super()

    if (feed && !feed.replicate) {
      opts = feed
      feed = null
    }
    opts = opts || {}
    // Old Options:
    // * `stream`: function, replication stream for connection. Default is `archive.replicate({live, upload, download})`.
    // * `upload`: bool, upload data to the other peer?
    // * `download`: bool, download data from the other peer?
    // * `port`: port for discovery swarm
    // * `utp`: use utp in discovery swarm
    // * `tcp`: use tcp in discovery swarm

    this._opts = opts
    this.id = opts.id || crypto.randomBytes(32)
    this._port = DEFAULT_PORTS.shift()
    this._portAlts = DEFAULT_PORTS
    if (opts.port) {
      if (Array.isArray(opts.port)) {
        this._port = opts.port.shift()
        this._portAlts = opts.port
      } else {
        this._port = opts.port
      }
    }

    this._swarm = discoverySwarm(swarmDefaults({
      // Discovery-swarm options
      hash: false,
      utp: defaultTrue(opts.utp),
      tcp: defaultTrue(opts.tcp),
      dht: defaultTrue(opts.dht),

      // Discovery-swarm-web options
      signalhub: opts.signalhub,
      discovery: opts.discovery,

      id: this.id,
      stream: this._createReplicationStream.bind(this)
    }))

    // bubble listening and errors
    this._swarm.on('listening', () => {
      this.port = this._swarm.address().port
      this.emit('listening', this.port)
      debug('swarm:listening', { port: this.port })
    })
    this._swarm.on('error', (err) => {
      if (err && err.code !== 'EADDRINUSE' && err.message !== 'Could not bind') return this.emit('error', err)
      const port = this._portAlts.shift()
      debug(`Port ${this._port} in use. Trying ${port}.`)
      this.listen(port)
    })

    // re-emit a variety of events
    const reEmit = (event) => {
      this._swarm.on(event, (...args) => {
        this.emit(event, ...args)
        debug(`swarm:${event}`, ...args)
      })
    }
    reEmit('peer')
    reEmit('peer-banned')
    reEmit('peer-rejected')
    reEmit('drop')
    reEmit('connecting')
    reEmit('connect-failed')
    reEmit('handshaking')
    reEmit('handshake-timeout')
    reEmit('connection')
    reEmit('connection-closed')
    reEmit('redundant-connection')

    this._replicatingFeeds = new Map()

    if (opts.autoListen !== false) {
      this.listen()
    }

    if (feed) {
      this.add(feed)
    }
  }

  get totalConnections () {
    // total connections across all keys
    return this._swarm.connections.length
  }

  connections (dKey) {
    if (!dKey) return this.totalConnections

    const feed = this._replicatingFeeds.get(dKey)
    return feed && feed.peers
  }

  _createReplicationStream (info) {
    var self = this

    // create the protocol stream
    var streamKeys = [] // list of keys replicated over the stream
    var stream = hypercoreProtocol({
      id: this.id,
      live: true,
      encrypt: true,
      extensions: this._opts.extensions
    })
    stream.peerInfo = info

    // add the dat if the discovery network gave us any info
    if (info.channel) {
      add(info.channel)
    }

    // add any requested dats
    stream.on('feed', add)

    function add (dkey) {
      const dkeyStr = datEncoding.toStr(dkey)

      // lookup the archive
      try {
        var feed = self._replicatingFeeds.get(dkeyStr)
        if (!feed) return // TODO: error ?
      } catch (err) {
        if (!stream.destroyed) stream.destroy(err)
      }

      self._replicatingFeeds.set(dkeyStr, feed)

      if (!feed || !feed.isSwarming) {
        return
      }

      if (!feed.replicationStreams) {
        feed.replicationStreams = []
      }
      if (feed.replicationStreams.indexOf(stream) !== -1) {
        return // already replicating
      }

      // create the replication stream
      feed.replicate({ stream, live: true })
      if (stream.destroyed) return // in case the stream was destroyed during setup

      // track the stream
      var keyStr = datEncoding.toStr(feed.key)
      streamKeys.push(keyStr)
      feed.replicationStreams.push(stream)

      function onend () {
        feed.replicationStreams = feed.replicationStreams.filter(s => (s !== stream))
      }
      stream.once('error', onend)
      stream.once('end', onend)
      stream.once('close', onend)
    }

    // debugging
    stream.on('error', err => {
      debug({
        event: 'connection-error',
        peer: `${info.host}:${info.port}`,
        connectionType: info.type,
        message: err.toString()
      })
    })

    return stream
  }

  add (feed) {
    if (!feed.key) return feed.ready(() => { this.add(feed) })
    const key = datEncoding.toStr(feed.key)
    const discoveryKey = datEncoding.toStr(feed.discoveryKey)
    this._replicatingFeeds.set(discoveryKey, feed)

    this.rejoin(feed.discoveryKey)
    this.emit('join', { key, discoveryKey })
    feed.isSwarming = true
  }

  rejoin (discoveryKey) {
    this._swarm.join(datEncoding.toBuf(discoveryKey))
  }

  listen (port) {
    port = port || this._port
    this._swarm.listen(port)
    return new Promise(resolve => {
      this._swarm.once('listening', resolve)
    })
  }

  leave (discoveryKey) {
    const dKeyStr = datEncoding.toStr(discoveryKey)
    const feed = this._replicatingFeeds.get(dKeyStr)
    if (!feed) return
    if (feed.replicationStreams) {
      feed.replicationStreams.forEach(stream => stream.destroy()) // stop all active replications
      feed.replicationStreams.length = 0
    }
    this._swarm.leave(feed.discoveryKey)
    this.emit('leave', { key: feed.key.toString('hex'), discoveryKey: dKeyStr })
  }

  close () {
    const self = this
    return new Promise((resolve, reject) => {
      this._replicatingFeeds.forEach((val, key) => {
        this.leave(key)
      })
      this._swarm.destroy(err => {
        if (err) return reject(err)
        self.emit('close')
        resolve()
      })
    })
  }
}

function defaultTrue (x) {
  return x === undefined ? true : x
}
