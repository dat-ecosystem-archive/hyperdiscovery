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
  self.connections = 0
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
  this.swarm.on('listening', function () {
    self.swarm.join(self.archive.discoveryKey)
  })
  this.swarm.on('connection', function (conn) {
    self.connections = self.swarm.connections.length
    conn.on('close', function () {
      self.connections = self.swarm.connections.length
    })
  })
  this.connections = this.swarm.connections

  this.swarm.listen(opts.port || 3282)
  this.swarm.once('error', function () {
    self.swarm.listen(0)
  })
  return this.swarm
}
