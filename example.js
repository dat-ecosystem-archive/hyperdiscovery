var hyperdrive = require('hyperdrive')
var ram = require('random-access-memory')
var Discovery = require('.')

var key = process.argv[2]
var archive = hyperdrive(ram, key)
var archive2 = hyperdrive(ram)
var discovery = Discovery(archive)

archive.ready(function (err) {
  if (err) throw err
  console.log('key', archive.key.toString('hex'))
})

const toWrite = 'console.log("Hello World!")'

archive2.ready(function (err) {
  if (err) throw err
  archive2.writeFile('example.js', toWrite, () => {})
  discovery.add(archive2)
  console.log('key', archive2.key.toString('hex'))
})

discovery.on('connection', function (peer, type) {
  console.log('connection')
  peer.on('close', function () {
    console.log('peer disconnected')
  })
})
discovery.on('listening', () => {
  console.log('listening')
})
discovery.on('error', (err) => {
  console.log('error', err)
})
