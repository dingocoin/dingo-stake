"use strict";

const fs = require('fs');
const request = require('request');
const Web3Utils = require('web3-utils');
const os = require("os");

const DINGO_COOKIE_PATH = '~/.dingocoin.private/.cookie'.replace('~', os.homedir);
const DINGO_PORT = 34646;

module.exports = {
  toSatoshi,
  fromSatoshi,
  getBlockHash,
  getBlock,
  getRawTransaction,
  decodeRawTransaction,
  getBlockchainInfo,
  decodeRawTransaction,
  getTxOut,
  createRawTransaction,
  fundRawTransaction,
  signRawTransaction,
  sendRawTransaction
};

function toSatoshi(x) {
  if (x === null || x === undefined || typeof(x) !== 'string' || x === '') {
    throw new Error('Expected string input');
  }
  return (BigInt(Web3Utils.toWei(x, 'gwei')) / 10n).toString();
}

function fromSatoshi(x) {
  if (x === null || x === undefined || typeof(x) !== 'string' || x === '') {
    throw new Error('Expected string input');
  }
  return (Web3Utils.fromWei((BigInt(x) * 10n).toString(), 'gwei')).toString();
}

function getCookie() {
  const data = fs.readFileSync(DINGO_COOKIE_PATH, 'utf-8').split(':');
  return {user: data[0], password: data[1]};
}

async function callRpc(method, params) {
  const cookie = getCookie();
  const options = {
      url: "http://localhost:" + DINGO_PORT.toString(),
      method: "post",
      headers: { "content-type": "text/plain" },
      auth: { user: cookie.user, pass: cookie.password },
      body: JSON.stringify( {"jsonrpc": "1.0", "method": method, "params": params})
  };

  return new Promise((resolve, reject) => {
    request(options, (err, resp, body) => {
      if (err) {
        return reject(err);
      } else {
        const r = JSON.parse(body
          .replace(/"(amount|value)":\s*(\-?)(\d+)\.((\d*?[1-9])0*),/g, '"$1":"$2$3\.$5",')
          .replace(/"(amount|value)":\s*(\-?)(\d+)\.0+,/g, '"$1":"$2$3",'));
        if (r.error) {
          reject(r.error);
        } else {
          resolve(r.result);
        }
      }
    });
  });
}

function getBlockHash(height) {
  return callRpc('getblockhash', [height]);
}

function getBlock(hash) {
  return callRpc('getblock', [hash]);
}

function getRawTransaction(hash) {
  return callRpc('getrawtransaction', [hash]);
}

function decodeRawTransaction(hex) {
  return callRpc('decoderawtransaction', [hex]);
}

function getBlockchainInfo() {
  return callRpc('getblockchaininfo', []);
}

function decodeRawTransaction(hex) {
  return callRpc('decoderawtransaction', [hex]);
}

function getTxOut(txid, vout) {
  return callRpc('gettxout', [txid, vout]);
}

function createRawTransaction(unspent, payouts) {
    return callRpc('createrawtransaction', [unspent, payouts]);
}

function fundRawTransaction(tx, changeAddress) {
    return callRpc('fundrawtransaction', [tx, {'changeAddress': changeAddress}]);
}

function signRawTransaction(tx) {
    return callRpc('signrawtransaction', [tx]);
}

function sendRawTransaction(tx) {
    return callRpc('sendrawtransaction', [tx]);
}
