var tape = require('tape')
var hypercore = require('hypercore')
var memdb = require('memdb')
var swarm = require('.')

var core1 = hypercore(memdb())
var core2 = hypercore(memdb())

function getSwarms (opts) {
  var feed1 = core1.createFeed()
  var feed2 = core2.createFeed(feed1.key)
  var write = swarm(feed1, opts)
  var read = swarm(feed2, opts)
  return [write, read]
}

tape('connect and close', function (t) {
  t.plan(8)
  var swarms = getSwarms()

  var write = swarms[0]
  var read = swarms[1]

  write.once('connection', function (peer, type) {
    t.ok(1, 'write connected')
    t.equals(write.connections.length, 1)
    write.close(function () {
      t.ok(1, 'write closed')
      read.close(function () {
        t.equals(write.connections.length, 0)
        t.equals(read.connections.length, 0)
        t.ok(1, 'read closed')
      })
    })
  })

  read.once('connection', function (peer, type) {
    t.ok(1, 'read connected')
    t.equals(read.connections.length, 1)
  })
})

tape('connect without utp', function (t) {
  t.plan(8)
  var swarms = getSwarms({utp: false})

  var write = swarms[0]
  var read = swarms[1]

  write.once('connection', function (peer, type) {
    t.ok(1, 'write connected')
    t.equals(write.connections.length, 1)
    write.close(function () {
      t.ok(1, 'write closed')
      read.close(function () {
        t.equals(write.connections.length, 0)
        t.equals(read.connections.length, 0)
        t.ok(1, 'read closed')
      })
    })
  })

  read.once('connection', function (peer, type) {
    t.ok(1, 'read connected')
    t.equals(read.connections.length, 1)
  })
})
