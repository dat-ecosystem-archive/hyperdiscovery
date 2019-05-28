const tape = require('tape')
const hypercore = require('hypercore')
const hyperdrive = require('hyperdrive')
// const hyperdb = require('hyperdb')
const ram = require('random-access-memory')
const Discovery = require('.')

function getHypercoreSwarms (opts) {
  return new Promise((resolve, reject) => {
    const feed1 = hypercore(ram)

    feed1.ready(() => {
      const feed2 = hypercore(ram, feed1.key)
      feed2.once('ready', () => {
        const write = Discovery(feed1, opts)
        const read = Discovery(feed2, opts)

        write.on('error', (err) => {
          throw err
        })
        read.on('error', (err) => {
          throw err
        })
        write.on('close', () => {
          close(feed1)
        })
        read.on('close', () => {
          close(feed2)
        })

        resolve([write, read])
      })
    })
  })
}

function getHyperdriveSwarms (opts) {
  return new Promise((resolve, reject) => {
    const archive1 = hyperdrive(ram)

    archive1.ready(() => {
      const archive2 = hyperdrive(ram, archive1.key)
      archive2.once('ready', () => {
        const write = Discovery(archive1, opts)
        const read = Discovery(archive2, opts)

        write.on('error', (err) => {
          throw err
        })
        read.on('error', (err) => {
          throw err
        })
        write.on('close', () => {
          close(archive1)
        })
        read.on('close', () => {
          close(archive2)
        })

        resolve([write, read])
      })
    })
  })
}

// function getDbSwarms (opts, cb) {
//   var db1 = hyperdb(ram, { valueEncoding: 'utf-8' })
//   db1.once('ready', function () {
//     var db2 = hyperdb(ram, db1.key, { valueEncoding: 'utf-8' })
//     db2.once('ready', function () {
//       var write = swarm(db1, opts)
//       var read = swarm(db2, opts)
//       var swarms = [write, read]
//       cb(swarms)
//     })
//   })
// }

tape('hypercore: connect and close', async (t) => {
  const [write, read] = await getHypercoreSwarms({})
  let missing = 2

  write.once('connection', (peer, type) => {
    t.pass('write connected')
    t.equals(write.totalConnections, 1)
    done()
  })

  read.once('connection', (peer, type) => {
    t.pass('read connected')
    t.equals(read.totalConnections, 1)
    done()
  })

  async function done () {
    if (--missing) return
    try {
      await write.close()
      await read.close()
    } catch (err) {
      t.error(err)
    }
    t.pass('discovery closed')
    t.end()
  }
})

tape('hypercore: connect without utp', async (t) => {
  const [write, read] = await getHypercoreSwarms({ utp: false })
  let missing = 2
  write.once('connection', (peer, type) => {
    t.pass('write connected')
    t.equals(write.totalConnections, 1)
    done()
  })

  read.once('connection', (peer, type) => {
    t.pass('read connected')
    t.equals(read.totalConnections, 1)
    done()
  })

  async function done () {
    if (--missing) return
    try {
      await write.close()
      await read.close()
    } catch (err) {
      t.error(err)
    }
    t.pass('discovery closed')
    t.end()
  }
})

tape('hypercore: multiple in single swarm', async (t) => {
  const [disc1, disc2] = await getHypercoreSwarms({ utp: false })
  const feed1 = hypercore(ram)
  let feed2

  disc1.on('connection', (peer, type) => {
    const dKey = feed1.discoveryKey.toString('hex')
    if (dKey === peer.discoveryKey.toString('hex')) {
      t.pass('added feeds connected')
      // t.equals(disc1.connections(dKey), 1)
      done()
    }
  })

  feed1.ready(() => {
    feed2 = hypercore(ram, feed1.key)
    disc1.add(feed1)
    disc2.add(feed2)
  })

  async function done () {
    try {
      await disc1.close()
      await disc2.close()
      await close(feed1)
      await close(feed2)
    } catch (err) {
      t.error(err)
    }
    t.pass('discovery closed')
    t.end()
  }
})

tape('hyperdrive: connect and close', async (t) => {
  const [write, read] = await getHyperdriveSwarms({ utp: false })
  let missing = 2

  write.once('connection', (peer, type) => {
    t.pass('write connected')
    t.equals(write.totalConnections, 1)
    done()
  })

  read.once('connection', (peer, type) => {
    t.pass('read connected')
    t.equals(read.totalConnections, 1)
    done()
  })

  async function done () {
    if (--missing) return
    try {
      await write.close()
      await read.close()
    } catch (err) {
      t.error(err)
    }
    t.pass('discovery closed')
    t.end()
  }
})

tape('hyperdrive: connect without utp', async (t) => {
  const [write, read] = await getHyperdriveSwarms({ utp: false })
  let missing = 2
  write.once('connection', (peer, type) => {
    t.pass('write connected')
    t.equals(write.totalConnections, 1)
    done()
  })

  read.once('connection', (peer, type) => {
    t.pass('read connected')
    t.equals(read.totalConnections, 1)
    done()
  })

  async function done () {
    if (--missing) return
    try {
      await write.close()
      await read.close()
    } catch (err) {
      t.error(err)
    }
    t.pass('discovery closed')
    t.end()
  }
})

tape('hyperdrive: multiple in single swarm', async (t) => {
  const [disc1, disc2] = await getHyperdriveSwarms({ utp: false })
  const archive1 = hyperdrive(ram)
  let archive2

  disc1.on('connection', (peer, type) => {
    const dKey = archive1.discoveryKey.toString('hex')
    if (dKey === peer.discoveryKey.toString('hex')) {
      t.pass('added feeds connected')
      // t.equals(disc1.connections(dKey), 1)
      done()
    }
  })

  archive1.ready(() => {
    archive2 = hyperdrive(ram, archive1.key)
    disc1.add(archive1)
    disc2.add(archive2)
  })

  async function done () {
    try {
      await disc1.close()
      await disc2.close()
      await close(archive1)
      await close(archive2)
    } catch (err) {
      t.error(err)
    }
    t.pass('discovery closed')
    t.end()
  }
})

// tape('hyperdb connect and close', (t) => {
//   t.plan(6)
//   getDbSwarms({}, function (swarms) {
//     var write = swarms[0]
//     var read = swarms[1]
//     var missing = 2

//     write.once('connection', (peer, type) => {
//       t.ok(1, 'write connected')
//       t.equals(write.connections.length, 1)
//       done()
//     })

//     read.once('connection', (peer, type) => {
//       t.ok(1, 'read connected')
//       t.equals(read.connections.length, 1)
//       done()
//     })

//     function done () {
//       if (--missing) return
//       write.close(function () {
//         t.ok(1, 'write closed')
//         read.close(function () {
//           t.ok(1, 'read closed')
//         })
//       })
//     }
//   })
// })

async function close (feed) {
  return new Promise(resolve => {
    feed.close(resolve)
  })
}
