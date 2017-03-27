var swarmDefaults = require('datland-swarm-defaults')
var disc = require('discovery-swarm')
var xtend = require('xtend')

module.exports = HyperdriveSwarm

function HyperdriveSwarm (archive, opts) {
  if (!(this instanceof HyperdriveSwarm)) return new HyperdriveSwarm(archive, opts)
  if (!opts) opts = {}

  var self = this
  this.archive = archive
  this.uploading = !(opts.upload === false)
  this.downloading = !(opts.download === false)
  this.live = !!opts.live

  // Discovery Swarm Options
  opts = xtend({
    port: 3282,
    id: archive.id,
    hash: false,
    stream: function (peer) {
      return archive.replicate({
        live: self.live,
        upload: self.uploading,
        download: self.downloading
      })
    }
  }, opts)

  this.swarm = disc(swarmDefaults(opts))
  this.swarm.once('error', function () {
    self.swarm.listen(0)
  })
  this.swarm.listen(opts.port)
  this.swarm.join(this.archive.discoveryKey)
  return this.swarm
}
