'use strict'

const fs = require('fs')
const exec = require('child_process').exec
const path = require('path')

exports.getAll = (folder) => Promise.resolve(
  fs.readdirSync(folder)
    .filter((item) => fs.statSync(path.join(folder, item)).isDirectory() && isRepo(item))
)

const isRepo = exports.isRepo = (folder) => {
  try {
    return fs.statSync(path.join(folder, '.git')).isDirectory()
  } catch (e) {
    return false
  }
}

exports.info = (folder) => {
  var info = { folderName: folder.match(/([^\/]*)\/*$/)[1] }
  return Promise.all([
    getBranch(folder).then((branch) => { info.branch = branch }),
    remoteComparison(folder).then((status) => { info.status = status })
  ]).then(() => info)
}

const getBranch = (folder) => new Promise((resolve, reject) => {
  process.chdir(folder)
  exec('git rev-parse --abbrev-ref @', (err, stdout, stderr) => {
    if (err) {
      reject(err)
    } else {
      resolve(stdout.replace(/\n/, ''))
    }
  })
})

const getLocalCommit = (folder) => new Promise((resolve, reject) => {
  process.chdir(folder)
  exec('git rev-parse @', (err, stdout, stderr) => {
    if (err) {
      reject(err)
    } else {
      resolve(stdout.replace(/\n/, ''))
    }
  })
})

const getRemoteCommit = (folder) => new Promise((resolve, reject) => {
  process.chdir(folder)
  exec('git rev-parse @{u}', (err, stdout, stderr) => {
    if (err) {
      reject(err)
    } else {
      resolve(stdout.replace(/\n/, ''))
    }
  })
})

const getMergeBase = (folder) => new Promise((resolve, reject) => {
  process.chdir(folder)
  exec('git merge-base @ @{u}', (err, stdout, stderr) => {
    if (err) {
      reject(err)
    } else {
      resolve(stdout.replace(/\n/, ''))
    }
  })
})

const remoteComparison = (folder) => {
  var local, remote, base
  return Promise.all([
    getLocalCommit(folder).then((commit) => {
      local = commit
    }),
    getRemoteCommit(folder).then((commit) => {
      remote = commit
    }),
    getMergeBase(folder).then((commit) => {
      base = commit
    })
  ]).then(() => {
    if (local === remote) {
      return 'Up-to-date'
    } else if (local === base) {
      return 'Need to pull'
    } else if (remote === base) {
      return 'Need to push'
    } else {
      return 'Diverged'
    }
  }).catch(() => '--')
}