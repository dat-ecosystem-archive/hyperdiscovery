const crypto = require('crypto')
const EventEmitter = require('events')

const datEncoding = require('dat-encoding')
const hypercoreProtocol = require('hypercore-protocol')
const discoverySwarm = require('discovery-swarm')
const swarmDefaults = require('dat-swarm-defaults')
const mutexify = require('mutexify')
const getPort = require('get-port')

const debug = require('debug')('hyperdiscovery')

module.exports = (...args) => new Hyperdiscovery(...args)

const DAT_SWARM_PORT = 3282
const PORT_ALTS = [3000,3002,3004,2001,2003,2005]

class Hyperdiscovery extends EventEmitter {
  constructor (feed, opts) {
    super()

    if (feed && !feed.replicate) {
      opts = feed
      feed = null
    }
    opts = opts || {}

    this._opts = opts
    this.id = opts.id || crypto.randomBytes(32)
    this.port = typeof opts.port === 'number' ? opts.port : DAT_SWARM_PORT

    this._swarm = discoverySwarm(swarmDefaults({
      id: this.id,
      hash: false,
      utp: defaultTrue(opts.utp),
      tcp: defaultTrue(opts.tcp),
      dht: defaultTrue(opts.dht),
      stream: this._createReplicationStream.bind(this)
    }))

    // bubble listening and errors
    this._swarm.on('listening', () => {
      this.port = this._swarm.address().port
      this.emit('listening', this.port)
      debug('swarm:listening', {port: this.port})
    })
    this._swarm.on('error', async (err) => {
      if (err && err.code !== 'EADDRINUSE') return this.emit('error', err)
      this.listen(await getPort({port: PORT_ALTS}))
    })

    // re-emit a variety of events
    const reEmit = (event) => {
      this._swarm.on(event, (...args) => {
        this.emit(event, ...args)
        debug(`swarm:${event}`, ...args)
      })
    }
    reEmit('error')
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
    this._lock = mutexify()

    if (opts.autoListen !== false) {
      this.listen()
    }

    if (feed) {
      this.add(feed)
    }
  }

  _createReplicationStream (info) {
    var self = this

    // create the protocol stream
    var streamKeys = [] // list of keys replicated over the stream
    var stream = hypercoreProtocol({
      id: this.id,
      live: true,
      encrypt: true
    })
    stream.peerInfo = info

    // add the dat if the discovery network gave us any info
    if (info.channel) {
      lockedAdd(info.channel)
    }

    // add any requested dats
    stream.on('feed', lockedAdd)

    function lockedAdd (dkey) {
      self._lock(release => {
        add(dkey)
          .then(() => release())
          .catch(err => release(err))
      })
    }

    async function add (dkey) {
      const dkeyStr = datEncoding.toStr(dkey)

      // lookup the archive
      try {
        var feed = self._replicatingFeeds.get(dkeyStr)
        if (!feed) return // ?
        // if (!feed) feed = await self._store._getSeedCore(dkey)
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
      feed.replicate({stream, live: true})
      if (stream.destroyed) return // in case the stream was destroyed during setup

      // track the stream
      var keyStr = datEncoding.toStr(feed.key)
      streamKeys.push(keyStr)
      feed.replicationStreams.push(stream)

      function onend () {
        feed.replicationStreams = feed.replicationStreams.filter(s => (s !== stream))

        // If the Replicator is the only object with a reference to this core, close it after replication's finished.
        if (!feed.replicationStreams.length) {
          self._replicatingFeeds.delete(dkeyStr)
          feed.close()
        }
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

    this.join(feed.discoveryKey)
    this.emit('join', {key, discoveryKey})
    feed.isSwarming = true
  }

  join (discoveryKey) {
    this._swarm.join(discoveryKey)
  }

  listen (port) {
    port = port || this.port
    this._swarm.listen(port)
    return new Promise(resolve => {
      this._swarm.once('listening', resolve)
    })
  }

  remove (discoveryKey) {
    const feed = this._replicatingFeeds.get(discoveryKey)
    if (!feed) return
    if (feed.replicationStreams) {
      feed.replicationStreams.forEach(stream => stream.destroy()) // stop all active replications
      feed.replicationStreams.length = 0
    }
    this._swarm.leave(discoveryKey)
  }

  async stop () {
    return new Promise((resolve, reject) => {
      this._swarm.destroy(err => {
        if (err) return reject(err)
        resolve()
      })
    })
  }
}

function defaultTrue (x) {
  return x === undefined ? true : x
}
