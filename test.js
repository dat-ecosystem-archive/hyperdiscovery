var tape = require('tape')
var webrtc = require('electron-webrtc')()
var hypercore = require('hypercore')
var memdb = require('memdb')
var swarm = require('.')

var core1 = hypercore(memdb())
var core2 = hypercore(memdb())

tape('connect and close', function (t) {
  t.plan(4)

  var feed1 = core1.createFeed()
  var feed2 = core2.createFeed(feed1.key)
  var write = swarm(feed1, {webrtc})
  var read = swarm(feed2, {webrtc})

  write.once('connection', function (peer, type) {
    t.ok(1, 'write connected')
    write.close(function () {
      t.ok(1, 'write closed')
      read.close(function () {
        t.ok(1, 'read closed')
        webrtc.close()
      })
    })
  })

  read.once('connection', function (peer, type) {
    t.ok(1, 'read connected')
  })
})
