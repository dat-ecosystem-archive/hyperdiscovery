var webRTCSwarm = require('webrtc-swarm')
var signalhub = require('signalhub')
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

  self.swarmKey = (opts.signalhubPrefix || 'dat-') + archive.discoveryKey.toString('hex')
  console.log(self.swarmKey)
  self.signalhub = opts.signalhub || DEFAULT_SIGNALHUB
  self.archive = archive
  self.browser = null
  self.node = null
  self.opts = opts
  if (!!rtc()) self._browser(self.swarmKey)
  if (process.versions.node) self._node(self.swarmKey)

  events.EventEmitter.call(this)
}

inherits(HyperdriveSwarm, events.EventEmitter)

HyperdriveSwarm.prototype._browser = function (swarmKey) {
  var self = this
  self.browser = webRTCSwarm(signalhub(swarmKey, self.signalhub))
  self.browser.on('peer', function (peer) {
    self.emit('browser-connection', peer)
    peer.pipe(self.archive.replicate()).pipe(peer)
  })
  return self.browser
}

HyperdriveSwarm.prototype._node = function (swarmKey) {
  var self = this

  var swarm = discoverySwarm(swarmDefaults({
    hash: false,
    stream: function (peer) {
      return self.archive.replicate()
    }
  }, self.opts))

  swarm.on('connection', function (peer) {
    self.emit('connection', peer)
  })

  swarm.on('listening', function () {
    swarm.join(swarmKey)
  })

  swarm.once('error', function () {
    swarm.listen(0)
  })

  swarm.listen(self.opts.port || 3282)
  self.node = swarm
  return swarm
}

module.exports = HyperdriveSwarm
