const nodeRpc = require("@dingocoin-js/node-rpc");
const Accumulator = require("@dingocoin-js/accumulator");
const cors = require("cors");
const express = require("express");
const rateLimit = require("express-rate-limit");
const fs = require("fs");

// In the same block, the same UTXO can appear in both the vout of some
// tx and the vin of some other tx. Take care to add first before deleting,
// so that these duplicates are removed.
const diff = async (height, block, rpcClient) => {
  const newUtxos = [];
  const delUtxos = [];

  for (const tx of block.txs) {
    for (const vout of tx.vouts) {
      if (vout.type !== "nulldata") {
        newUtxos.push({
          txid: vout.txid,
          vout: vout.vout,
          height: height,
          address: vout.address,
          amount: vout.value,
        });
      }
    }

    for (const vin of tx.vins) {
      if (vin.type !== "coinbase") {
        delUtxos.push({ txid: vin.txid, vout: vin.vout, address: vin.address });
      }
    }
  }

  return { newUtxos: newUtxos, delUtxos: delUtxos };
};

const STAKE_SIZE = 100000n;
const STAKE_START = 370000;
const PAYOUT_INTERVAL = 10000;

(async () => {
  // Create RPC client.
  const rpcClient = nodeRpc.fromCookie();

  // Staking results.
  //
  // staked holds the valid staked UTXOs at any point in time.
  // currentStaked holds the valid ones only for the current round.
  //
  // Essentially, when an address's stakes are invalidated, you
  // delete from both. When an address has a stake added, you add
  // only to the first. The first dictionary is transferred to the second
  // every PAYOUT_INTERVAL blocks.
  let staked = {};
  let currentStaked = {};

  let stakedString = {};
  let currentStakedString = {};

  // Create accumulator program.
  const acc = new Accumulator(
    rpcClient,
    STAKE_START,
    120,
    async (height, block) => {
      if (height % 100 === 0) {
        console.log("[Live sync] Height = " + height);
      }

      // Compute diff from current block.
      const { delUtxos, newUtxos } = await diff(height, block, rpcClient);

      // Insert new UTXOs.
      for (const utxo of newUtxos) {
        if (
          /^\d+$/.test(utxo.amount) &&
          BigInt(utxo.amount) % STAKE_SIZE === 0n
        ) {
          if (!(utxo.address in staked)) {
            staked[utxo.address] = { amount: 0n, score: 0n };
          }
          staked[utxo.address].amount += BigInt(utxo.amount);
          staked[utxo.address].score += BigInt(utxo.amount) / STAKE_SIZE;
        }
      }

      // Delete spent UTXOs.
      for (const utxo of delUtxos) {
        for (const d of [staked, currentStaked]) {
          if (utxo.address in d) {
            delete d[utxo.address];
          }
        }
      }

      // Compute accumulated stake results at payout intervals.
      if (
        (height - STAKE_START) % PAYOUT_INTERVAL === 0 &&
        height > STAKE_START
      ) {
        // Save currentStaked.
        const payout = {};
        for (const k of Object.keys(currentStaked)) {
          payout[k] = currentStaked[k].score.toString();
        }
        fs.writeFileSync(
          `history/${height}.payout.json`,
          JSON.stringify(payout)
        );

        // Reset current staked.
        currentStaked = {};
        for (const k of Object.keys(staked)) {
          currentStaked[k] = {
            amount: staked[k].amount,
            score: staked[k].score,
          };
        }
      }

      // Cache string copies.
      stakedString = {};
      for (const k of Object.keys(staked)) {
        stakedString["..." + k.slice(20)] = {
          amount: staked[k].amount.toString(),
          score: staked[k].score.toString(),
        };
      }
      currentStakedString = {};
      for (const k of Object.keys(currentStaked)) {
        currentStakedString["..." + k.slice(20)] = {
          amount: currentStaked[k].amount.toString(),
          score: currentStaked[k].score.toString(),
        };
      }
    }
  );
  acc.start();

  // API.
  const app = express();
  app.use(cors());
  app.use(express.json());
  const createRateLimit = (windowS, count) =>
    rateLimit({ windowMs: windowS * 1000, max: count });

  app.get("/current", createRateLimit(1, 5), (req, res) => {
    res.send(currentStakedString);
  });

  app.get("/next", createRateLimit(1, 5), (req, res) => {
    res.send(stakedString);
  });

  app.get("/stats", createRateLimit(1, 5), (req, res) => {
    let totalStaked = 0n;
    for (const k of Object.keys(currentStaked)) {
      totalStaked += BigInt(currentStaked[k].amount);
    }
    res.send({ totalStaked: totalStaked.toString() });
  });

  app.listen(80, () => {
    console.log(`Started on port 80`);
  });
})();
