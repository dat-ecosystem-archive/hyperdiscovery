var pump = require('pump')
var signalhub = require('signalhub')
var swarmDefaults = require('datland-swarm-defaults')
var inherits = require('inherits')
var HybridSwarm = require('hybrid-swarm')

var DEFAULT_SIGNALHUBS = 'https://signalhub.mafintosh.com'

module.exports = HyperdriveSwarm

function HyperdriveSwarm (archive, opts) {
  if (!(this instanceof HyperdriveSwarm)) return new HyperdriveSwarm(archive, opts)
  if (!opts) opts = {}
  this.archive = archive
  this.uploading = !(opts.upload === false)
  this.downloading = !(opts.download === false)
  var self = this
  var swarmKey = (opts.signalhubPrefix || 'dat-') + archive.discoveryKey.toString('hex')
  var hybridOpts = {
    signalhub: signalhub(swarmKey, opts.signalhub || DEFAULT_SIGNALHUBS),
    discovery: swarmDefaults({
      id: archive.id,
      hash: false,
      stream: function (peer) {
        return archive.replicate({
          upload: self.uploading,
          download: self.downloading
        })
      },
      utp: opts.utp,
      tcp: opts.tcp
    }),
    wrtc: opts.wrtc,
    port: opts.port
  }

  HybridSwarm.call(this, hybridOpts)
}

inherits(HyperdriveSwarm, HybridSwarm)

HyperdriveSwarm.prototype._connection = function (conn, opts) {
  var self = this
  if (opts.type === 'webrtc-swarm') {
    var peer = self.archive.replicate({
      upload: self.uploading,
      download: self.downloading
    })
    pump(conn, peer, conn)
  }
}

HyperdriveSwarm.prototype._listening = function () {
  this.node.join(this.archive.discoveryKey)
}
