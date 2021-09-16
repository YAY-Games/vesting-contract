# $YAY Vesting contract

[![HardhatBuild](https://github.com/YAY-Games/vesting-contract/actions/workflows/testing.yaml/badge.svg)](https://github.com/YAY-Games/vesting-contract/actions/workflows/testing.yaml)
[![codecov](https://codecov.io/gh/YAY-Games/vesting-contract/branch/master/graph/badge.svg?token=sdsAmkTzOF)](https://codecov.io/gh/YAY-Games/vesting-contract)

- Language: Solidity v0.6.12

- Project framework: hardhat + truffle / web3

- Nodejs: v14.17.0

## Overview

### Deployed

[Binance Smart Chain](https://bscscan.com/address/0xd1b783336E0495B1d22EF8Ca8aC1b7b89C997c44#code)

[Avalanche C-chain](https://cchain.explorer.avax.network/address/0x9297c0833050B2fB2dBf5e285095BA4a2B342c68/transactions)

## Installation & Usage

1. Install packages
```
npm i --save-dev
```

2. Build project
```
npm run build
```

### Testing

```
npm test
```

### Run linter

```
npm run lint
```

### Deploy

1. Edit scripts/mercleTreeData.json

Tip:
```
category id:
1 = SEED
2 = STRATEGIC
3 = PRESALE
4 = PUBLIC
5 = V24MONTH
6 = V20MONTH
7 = V4MONTH
```

2. Generate mercle tree root
```
npx hardhat run scripts/generate-mercle-root.js
```

3. Setup environment variables:
```
cp .env.example .env
// edit .env
```

4. Edit network in ```hardhat.config.js``` ([docs](https://hardhat.org/config/))

5. Run command:
```
npx hardhat run scripts/deploy-script.js --network <network name>
```

More info: ([link](https://docs.google.com/spreadsheets/d/1Dl3pxKKNMflSSM5MUe-cJdQMooIXXRIo/edit?usp=sharing&ouid=111440494197941322385&rtpof=true&sd=true))



## License

[MIT License](./LICENSE)
