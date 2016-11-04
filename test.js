var tape = require('tape')
var hypercore = require('hypercore')
var memdb = require('memdb')
var swarm = require('.')

var core1 = hypercore(memdb())
var core2 = hypercore(memdb())

tape('connect and close', function (t) {
  t.plan(8)

  var feed1 = core1.createFeed()
  var feed2 = core2.createFeed(feed1.key)
  var write = swarm(feed1)
  var read = swarm(feed2)

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
