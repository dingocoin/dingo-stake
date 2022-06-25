# dingostake

Source code for Dingocoin's [staking program](https://dingocoin.org/stake).

## Dependencies
- Node.js v16+
- Yarn package manager
- [Dingocoin core](https://github.com/dingocoin/dingocoin/releases/tag/v1.16.0.5)

## Setup
1) Clone this repository
2) In the cloned folder, install node dependencies: `yarn install`.

## Running

#### 1) Launch Dingocoin core daemon with transaction index
```
./dingocoind -txindex
```
Wait for the blocks to sync up. You can use `./dingocoin-cli getblockchaininfo` to check the sync progress.

#### 2) Launch staking daemon
In the clone project folder, run
```
yarn start
```
This will run the staking daemon. The staking daemon scans all existing and incoming blocks from the Dingocoin mainnet. 
For each transaction, the relevant scoring rules are applied for each transaction:
- new UTXOs of exactly 100K multiples are counted toward an address's stake;
- expenditure from an address invalidates its existing stake).

## Querying results

### Payouts
After each payout interval (10K), the number of staked units (x100K coins) for each address are written to `history/<PAYOUT_HEIGHT>.payout.json`. 
We provide a script, `payout.js`, which you can use to process these payout data. It also creates and send the Dingocoin payout transaction.

### REST API
The staking daemon exposes an additional REST API where live results can be queried:
```
GET /current
Gets the staking units for each address in the current round, with addresses truncated for privacy.

GET /next
Gets the staking units for each address in the next rount, with addresses truncated for privacy.

GET /stats
Returns the overall staking stats.
```

