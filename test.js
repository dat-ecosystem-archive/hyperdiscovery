var tape = require('tape')
var hypercore = require('hypercore')
var ram = require('random-access-memory')
var swarm = require('.')

function getSwarms (opts, cb) {
  var feed1 = hypercore(ram)
  feed1.once('ready', function () {
    var feed2 = hypercore(ram, feed1.key)
    feed2.once('ready', function () {
      var write = swarm(feed1, opts)
      var read = swarm(feed2, opts)
      cb([write, read])
    })
  })
}

tape('connect and close', function (t) {
  t.plan(6)
  getSwarms({}, function (swarms) {
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
})

tape('connect without utp', function (t) {
  t.plan(6)
  getSwarms({utp: false}, function (swarms) {
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
})
