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
  t.plan(6)
  var swarms = getSwarms()

  var write = swarms[0]
  var read = swarms[1]
  var missing = 2

  write.once('connection', function (peer, type) {
    t.ok(1, 'write connected')
    t.equals(write.connections.length, 1)
    done()
  })

  read.once('connection', function (peer, type) {
    t.ok(1, 'read connected')
    t.equals(read.connections.length, 1)
    done()
  })

  function done () {
    if (--missing) return
    write.close(function () {
      t.ok(1, 'write closed')
      read.close(function () {
        t.ok(1, 'read closed')
      })
    })
  }
})

tape('connect without utp', function (t) {
  t.plan(6)
  var swarms = getSwarms({utp: false})

  var write = swarms[0]
  var read = swarms[1]
  var missing = 2

  write.once('connection', function (peer, type) {
    t.ok(1, 'write connected')
    t.equals(write.connections.length, 1)
    done()
  })

  read.once('connection', function (peer, type) {
    t.ok(1, 'read connected')
    t.equals(read.connections.length, 1, 'connection length')
    done()
  })

  function done () {
    if (--missing) return
    write.close(function () {
      t.ok(1, 'write closed')
      read.close(function () {
        t.ok(1, 'read closed')
      })
    })
  }
})
