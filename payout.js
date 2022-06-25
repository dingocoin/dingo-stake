const nodeRpc = require("@dingocoin-js/node-rpc");
const fs = require("fs");

const CHANGE_ADDRESS = "DTE3TFVBy69od8XaRPVHoDfrucgMFjVzYc";
const PAYOUT = 500000n;

(async function () {
  // Load and parse history file.
  const historyFile = process.argv[2];
  console.log(`Reading history file: ${historyFile}...`);
  const scores = JSON.parse(fs.readFileSync(historyFile));
  let scoreTotal = 0n;
  for (const k of Object.keys(scores)) {
    scores[k] = BigInt(scores[k]);
    scoreTotal += scores[k];
  }

  // Compute payouts.
  const outputs = {};
  for (const k of Object.keys(scores)) {
    outputs[k] = ((scores[k] * PAYOUT) / scoreTotal).toString();
    console.log(`  ${k} -> ${outputs[k]}`);
  }

  // Create RPC client.
  const rpcClient = nodeRpc.fromCookie();

  // Create transaction and sign.
  const rawTx = await rpcClient
    .createRawTransaction([], outputs)
    .catch(console.log);
  const fundedRawTx = (
    await rpcClient
      .fundRawTransaction(rawTx, { changeAddress: CHANGE_ADDRESS })
      .catch(console.log)
  ).hex;
  const signedTx = (
    await rpcClient.signRawTransaction(fundedRawTx).catch(console.log)
  ).hex;

  // Delay for user confirmation.
  console.log(signedTx);
  console.log("Sending raw transaction in");
  for (let i = 0; i < 10; i++) {
    console.log(`  ${10 - i} seconds...`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Send transaction and print txid.
  const result = await rpcClient.sendRawTransaction(signedTx);
  console.log(result);
})();
