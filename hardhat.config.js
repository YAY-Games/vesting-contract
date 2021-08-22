require("@nomiclabs/hardhat-web3");
require("@nomiclabs/hardhat-truffle5");
require("solidity-coverage");
require('dotenv').config()


const getEnv = env => {
  const value = process.env[env];
  if (typeof value === 'undefined') {
    console.log(`${env} has not been set.`);
    return "";
  }
  return value;
};

task("accounts", "Prints accounts", async (_, { web3 }) => {
  console.log(await web3.eth.getAccounts());
});

module.exports = {
  // defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      hardfork: "istanbul"
    },
    // production: {
    //   url: getEnv('RPC_URL'),
    //   accounts: [getEnv('PRIVATE_KEY')]
    // }
  },
  solidity: {
    version: "0.6.12",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
    },
  },
};
