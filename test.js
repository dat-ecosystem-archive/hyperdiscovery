var tape = require('tape')
var hypercore = require('hypercore')
var hyperdb = require('hyperdb')
var ram = require('random-access-memory')
var swarm = require('.')

function getHypercoreSwarms (opts, cb) {
  var feed1 = hypercore(ram)
  feed1.once('ready', function () {
    var feed2 = hypercore(ram, feed1.key)
    feed2.once('ready', function () {
      var write = swarm(feed1, opts)
      var read = swarm(feed2, opts)
      var swarms = [write, read]
      cb(swarms)
    })
  })
}

function getDbSwarms (opts, cb) {
  var db1 = hyperdb(ram, {valueEncoding: 'utf-8'})
  db1.once('ready', function () {
    var db2 = hyperdb(ram, db1.key, {valueEncoding: 'utf-8'})
    db2.once('ready', function () {
      var write = swarm(db1, opts)
      var read = swarm(db2, opts)
      var swarms = [write, read]
      cb(swarms)
    })
  })
}

tape('connect and close', function (t) {
  t.plan(6)
  getHypercoreSwarms({}, function (swarms) {
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
  getHypercoreSwarms({utp: false}, function (swarms) {
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

tape('hyperdb connect and close', function (t) {
  t.plan(6)
  getDbSwarms({}, function (swarms) {
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
