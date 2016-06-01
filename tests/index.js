var Swarm = require('../')
var path = require('path')
var fs = require('fs')
var test = require('tape')

var FIXTURES_DIR = path.join(__dirname, 'fixtures')
var DOWNLOAD_DIR = path.join(__dirname, 'downloads')

test('link generates itself', function (t) {
  var swarm = Swarm()
  swarm.link(FIXTURES_DIR, function (err, link) {
    t.ifError(err)
    t.equals(link.length, 64)
    t.end()
    swarm.close()
  })
})

test('replicates link properly', function (t) {
  var swarm = Swarm()
  var swarm2 = Swarm()
  swarm.link(FIXTURES_DIR, function (err, link) {
    t.ifError(err)
    t.equals(link.length, 64)
    swarm.join(link, FIXTURES_DIR, function (err) {
      t.ifError(err)
      swarm2.join(link, DOWNLOAD_DIR, function (err) {
        t.ifError(err)
        var files = fs.readdirSync(FIXTURES_DIR)
        files.forEach(function (file) {
          var downloadPath = path.join(DOWNLOAD_DIR, file)
          t.true(fs.existsSync(downloadPath), 'file ' + downloadPath + ' exists')
        })
        swarm.close()
        swarm2.close()
        t.end()
      })
    })
  })
})
