var hyperdrive = require('hyperdrive')
var memdb = require('memdb')
var swarm = require('.')

var drive = hyperdrive(memdb())
var archive = drive.createArchive()

var sw = swarm(archive)
sw.on('connection', function (peer, type) {
  console.log('got', peer, type) // type is 'webrtc-swarm' or 'discovery-swarm'
  console.log('connected to', sw.connections, 'peers')
  peer.on('close', function () {
    console.log('peer disconnected')
  }) 
})
