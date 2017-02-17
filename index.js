var swarmDefaults = require('datland-swarm-defaults')
var disc = require('discovery-swarm')

module.exports = HyperdriveSwarm

function HyperdriveSwarm (archive, opts) {
  if (!(this instanceof HyperdriveSwarm)) return new HyperdriveSwarm(archive, opts)
  if (!opts) opts = {}
  this.archive = archive
  this.uploading = !(opts.upload === false)
  this.downloading = !(opts.download === false)
  this.live = !!opts.live
  var self = this
  opts.id = archive.id
  opts.hash = false
  opts.stream = opts.stream || function (peer) {
    return archive.replicate({
      live: self.live,
      upload: self.uploading,
      download: self.downloading
    })
  }
  this.swarm = disc(swarmDefaults(opts))
  this.swarm.once('error', function () {
    self.swarm.listen(0)
  })
  this.swarm.listen(opts.port || 3282)
  this.swarm.join(this.archive.discoveryKey)
  return this.swarm
}
