var webRTCSwarm = require('webrtc-swarm')
var signalhub = require('signalhub')
var events = require('events')
var discoverySwarm = require('discovery-swarm')
var swarmDefaults = require('datland-swarm-defaults')
var hasWebRTC = !!require('get-browser-rtc')()

var DEFAULT_SIGNALHUB = 'https://signalhub.mafintosh.com'

module.exports = function (archive, opts) {
  var emitter = new events.EventEmitter()
  if (!opts) opts = {}
  var swarmKey = (opts.signalhubPrefix || 'dat-') + (archive.discoveryKey || archive.key).toString('hex')

  if (hasWebRTC) {
    var ws = webRTCSwarm(signalhub(swarmKey, opts.signalhub || DEFAULT_SIGNALHUB))
    ws.on('peer', function (peer) {
      emitter.emit('peer', peer)
      peer.pipe(archive.replicate()).pipe(peer)
    })
  }

  if (process.versions.node) {
    var ds = discoverySwarm(swarmDefaults({
      hash: false,
      stream: function (peer) {
        emitter.emit('peer', peer)
        return archive.replicate()
      }
    }, opts))
    ds.once('listening', function () {
      ds.join(archive.discoveryKey)
    })
    ds.listen(0)
  }
  return emitter
}
