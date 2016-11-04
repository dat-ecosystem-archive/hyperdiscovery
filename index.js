var swarmDefaults = require('datland-swarm-defaults')
var disc = require('discovery-swarm')

module.exports = HyperdriveSwarm

function HyperdriveSwarm (archive, opts) {
  if (!(this instanceof HyperdriveSwarm)) return new HyperdriveSwarm(archive, opts)
  if (!opts) opts = {}
  this.archive = archive
  this.uploading = !(opts.upload === false)
  this.downloading = !(opts.download === false)
  var self = this
  this.swarm = disc(swarmDefaults({
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
  }))
  this.swarm.join(this.archive.discoveryKey)
  return this.swarm
}
