var webRTCSwarm = require('webrtc-swarm')
var signalhub = require('signalhub')
var pump = require('pump')
var inherits = require('inherits')
var events = require('events')
var discoverySwarm = require('discovery-swarm')
var swarmDefaults = require('datland-swarm-defaults')
var rtc = require('get-browser-rtc')

var DEFAULT_SIGNALHUB = 'https://signalhub.mafintosh.com'

function HyperdriveSwarm (archive, opts) {
  if (!(this instanceof HyperdriveSwarm)) return new HyperdriveSwarm(archive, opts)
  var self = this

  if (!opts) opts = {}

  self.connections = 0
  self.signalhub = opts.signalhub || DEFAULT_SIGNALHUB
  self.archive = archive
  self.browser = null
  self.node = null
  self.opts = opts
  if (!!rtc()) self._browser()
  if (process.versions.node) self._node()

  events.EventEmitter.call(this)
}

inherits(HyperdriveSwarm, events.EventEmitter)

HyperdriveSwarm.prototype._browser = function () {
  var self = this
  var swarmKey = (self.opts.signalhubPrefix || 'dat-') + self.archive.discoveryKey.toString('hex')
  self.browser = webRTCSwarm(signalhub(swarmKey, self.signalhub))
  self.browser.on('peer', function (peer) {
    self.connections++
    peer.on('close', function () { self.connections-- })
    self.emit('browser-connection', peer)
    pump(peer, self.archive.replicate(), peer)
  })
  return self.browser
}

HyperdriveSwarm.prototype._node = function () {
  var self = this

  var swarm = discoverySwarm(swarmDefaults({
    id: self.archive.id,
    hash: false,
    stream: function (peer) {
      return self.archive.replicate()
    }
  }, self.opts))

  swarm.on('connection', function (peer) {
    self.connections++
    peer.on('close', function () { self.connections-- })
    self.emit('connection', peer)
  })

  swarm.on('listening', function () {
    swarm.join(self.archive.discoveryKey)
  })

  swarm.once('error', function () {
    swarm.listen(0)
  })

  swarm.listen(self.opts.port || 3282)
  self.node = swarm
  return swarm
}

module.exports = HyperdriveSwarm
