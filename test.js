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
  var left = hyperdb(ram, {valueEncoding: 'utf-8'})
  left.once('ready', function () {
    var right = hyperdb(ram, left.key, {valueEncoding: 'utf-8'})
    right.once('ready', function () {
      var leftSwarm = swarm(left, opts)
      var rightSwarm = swarm(right, opts)
      var dbs = [left, right]
      var swarms = [leftSwarm, rightSwarm]
      cb(dbs, swarms)
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

tape('hyperdb two-way sync', function (t) {
  t.plan(6)
  getDbSwarms({}, function (dbs, swarms) {
    var left = dbs[0]
    var right = dbs[1]
    var leftSwarm = swarms[0]
    var rightSwarm = swarms[1]
    var debounceWindow = 1000

    testSettingValue(left, right, '/left', 'left to right', function () {
      testSettingValue(right, left, '/right', 'right to left', function () {
        leftSwarm.close(function () {
          t.ok(1, 'left closed')
          rightSwarm.close(function () {
            t.ok(1, 'right closed')
          })
        })
      })
    })

    function testSettingValue (src, dest, key, expectedValue, cb) {
      src.put(key, expectedValue, function (err) {
        if (err) throw err
        dest.on('download', debounce(function () {
          getDbValues(src, dest, key, function (srcVal, destVal) {
            t.is(srcVal, expectedValue)
            t.is(destVal, expectedValue)
            cb()
          })
        }, debounceWindow))
      })
    }
  })
})

function getDbValues (src, dest, key, cb) {
  var srcValue, destValue
  src.get(key, function (err, entry) {
    if (err) throw err
    srcValue = entry[0].value
    done()
  })
  dest.get(key, function (err, entry) {
    if (err) throw err
    destValue = entry[0].value
    done()
  })

  function done () {
    if (!srcValue || !destValue) return
    cb(srcValue, destValue)
  }
}

function debounce (fn, delay) {
  var timeout
  return function () {
    var _this = this
    var args = arguments

    clearTimeout(timeout)
    timeout = setTimeout(function () {
      timeout = null
      fn.apply(_this, args)
    }, delay)
  }
}
