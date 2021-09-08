require('@openzeppelin/test-helpers');

const { MerkleTree } = require('merkletreejs');
const keccak256 = require('keccak256');

const { expect } = require('chai');
const { BN, expectRevert, constants } = require('@openzeppelin/test-helpers');
const { ZERO_ADDRESS } = constants;
const { advanceBlockAndSetTime, advanceTimeAndBlock } = require('./helpers/standingTheTime');

const ERC20Mock = artifacts.require('ERC20Mock');
const YayVestingMock = artifacts.require('YayVestingMock');
const YayVesting = artifacts.require('YayVesting');

const DAY = 86400;
const STEP_COUNT = 4;

contract('YayVesting', function (accounts) {

    async function claimInAllCases(rewardAfterTge, stepReward, deltaTime, accountPos) {
    
        it('before TGE', async function () {
            await advanceBlockAndSetTime(this.tgeTimestamp - 1*DAY);
    
            const proof = this.merkleTree.getHexProof(this.elems[accountPos]);
            await expectRevert(
                this.yayVesting.claim(this.balances[accountPos][1], this.balances[accountPos][2], proof, {from: accounts[accountPos]}),
                'YayVesting: TGE has not started yet',
            );
            
        });
    
        for (let i = 0; i < (STEP_COUNT + 1); i++) {
            // console.log("");
            for (let j = 0; j < 2**i; j++) {
                let a = [];
                for (let k = 0; k < i; k++) {
                    if ((j >> k) & 1) {
                        a.push(k);
                    }
                }
                a.push(i)
                // console.log(a);
                
                let testMsg = i == 0 ? 'after tge' : `step ${i}, variant ${a}`
                it(testMsg, async function () {
                    const proof = this.merkleTree.getHexProof(this.elems[accountPos]);

                    let totalClaimed = new BN("0");
                    let afterTgeValue = this.balances[accountPos][2].mul(rewardAfterTge).div(new BN("10000"));
                    for (const elem of a) {
                        await advanceBlockAndSetTime(this.tgeTimestamp + deltaTime * elem + 1*DAY);
                        let result = (await this.yayVesting.claim.call(this.balances[accountPos][1], this.balances[accountPos][2], proof, {from: accounts[accountPos]}));
                        let expectedReward;

                        
                        if (elem == 0) {
                            expectedReward = afterTgeValue;
                        } else {
                            expectedReward = this.balances[accountPos][2].mul(stepReward).div(new BN("10000")).mul(new BN(elem)).add(afterTgeValue).sub(totalClaimed);
                        }

                        await assert.equal(
                            result.toString(),
                            expectedReward.toString()
                        );

                        totalClaimed = totalClaimed.add(result);

                        await this.yayVesting.claim(this.balances[accountPos][1], this.balances[accountPos][2], proof, {from: accounts[accountPos]});
                        expect((await this.token.balanceOf.call(accounts[accountPos])).toString()).to.equal(totalClaimed.toString());

                        await expectRevert(
                            this.yayVesting.claim(this.balances[accountPos][1], this.balances[accountPos][2], proof, {from: accounts[accountPos]}),
                            'YayVesting: no tokens to claim',
                        );
                    }
                });  
            }
        }
    }

    before(function() {
        this.balances = [
            [accounts[0], 1, new BN('10000')],
            [accounts[1], 2, new BN('15000')],
            [accounts[2], 3, new BN('20000')],
            [accounts[3], 4, new BN('30000')],
            [accounts[4], 0, new BN('30000')],
            [accounts[5], 1, new BN('0')],
            [accounts[6], 5, new BN('100000')],
            [accounts[7], 6, new BN('100000')]
        ];
        
        this.elems = [];
        this.balances.forEach(element => {
            let hash = web3.utils.soliditySha3(element[0], element[1], element[2]);
            this.elems.push(hash);
        });

        this.merkleTree = new MerkleTree(this.elems, keccak256, { hashLeaves: false, sortPairs: true });

        this.merkleRoot = this.merkleTree.getHexRoot();
    });

    it('negative constructor', async function () {
        this.totalTokens = web3.utils.toWei("1000","ether");
        this.token = await ERC20Mock.new("Test", "TEST", this.totalTokens);

        this.tgeTimestamp = (await web3.eth.getBlock('latest')).timestamp + 5;
        this.yayVesting = await YayVesting.new(
            this.token.address,
            this.merkleRoot,
            this.tgeTimestamp
        );

        await expectRevert(
            YayVesting.new(
                ZERO_ADDRESS,
                this.merkleRoot,
                this.tgeTimestamp
            ),
            "YayVesting: zero token address",
        );
        await expectRevert(
            YayVesting.new(
                this.token.address,
                "0x0000000000000000000000000000000000000000000000000000000000000000",
                this.tgeTimestamp
            ),
            "YayVesting: zero mercle root",
        );
        await expectRevert(
            YayVesting.new(
                this.token.address,
                this.merkleRoot,
                "0"
            ),
            "ayVesting: wrong TGE timestamp",
        );
    });

    describe('mock contract', function () {
        beforeEach(async function () {
            this.totalTokens = web3.utils.toWei("1000","ether");
            this.token = await ERC20Mock.new("Test", "TEST", this.totalTokens);
    
            this.tgeTimestamp = (await web3.eth.getBlock('latest')).timestamp + 5;
            this.yayVesting = await YayVestingMock.new(
                this.token.address,
                this.merkleRoot,
                this.tgeTimestamp,
                STEP_COUNT,
                STEP_COUNT,
                STEP_COUNT,
                STEP_COUNT,
            );
    
            await this.token.transfer(this.yayVesting.address, this.totalTokens);
        });

        describe('vesting by categories', function () {
            describe('seed vesting', function () {
                claimInAllCases(new BN("1000"), new BN("600"), 30*DAY, 0);
            });
            describe('strategic vesting', function () {
                claimInAllCases(new BN("1000"), new BN("750"), 30*DAY, 1);
            });
            describe('presale vesting', function () {
                claimInAllCases(new BN("1000"), new BN("2250"), 30*DAY, 2);
            });
            describe('public vesting', function () {
                claimInAllCases(new BN("2000"), new BN("1000"), 7*DAY, 3);
            });
            describe('v24month vesting', function () {
                claimInAllCases(new BN("417"), new BN("417"), 30*DAY, 6);
            });
            // describe('v20month vesting', function () {
            //     claimInAllCases(new BN("0"), new BN("500"), 30*DAY, 7);
            // });
        });
    });

    describe('real contract', function () {
        beforeEach(async function () {
            this.totalTokens = web3.utils.toWei("1000","ether");
            this.token = await ERC20Mock.new("Test", "TEST", this.totalTokens);
    
            this.tgeTimestamp = (await web3.eth.getBlock('latest')).timestamp + 5;
            this.yayVesting = await YayVesting.new(
                this.token.address,
                this.merkleRoot,
                this.tgeTimestamp
            );
    
            await this.token.transfer(this.yayVesting.address, this.totalTokens);
        });

        describe('verify', function () {
            it('positive proof', async function () {
                const proof1 = this.merkleTree.getHexProof(this.elems[0]);
                const result1 = await this.yayVesting.checkClaim(this.balances[0][0], this.balances[0][1], this.balances[0][2], proof1)
                expect(result1).to.equal(true);
    
                const proof2 = this.merkleTree.getHexProof(this.elems[1]);
                const result2 = await this.yayVesting.checkClaim(this.balances[1][0], this.balances[1][1], this.balances[1][2], proof2)
                expect(result2).to.equal(true);
    
                const proof3 = this.merkleTree.getHexProof(this.elems[2]);
                const result3 = await this.yayVesting.checkClaim(this.balances[2][0], this.balances[2][1], this.balances[2][2], proof3)
                expect(result3).to.equal(true);
    
                const proof4 = this.merkleTree.getHexProof(this.elems[3]);
                const result4 = await this.yayVesting.checkClaim(this.balances[3][0], this.balances[3][1], this.balances[3][2], proof4)
                expect(result4).to.equal(true);
            });
            it('negative proof', async function () {
                const proof1 = this.merkleTree.getHexProof(this.elems[0]);
                const result1 = await this.yayVesting.checkClaim(this.balances[1][0], this.balances[0][1], this.balances[0][2], proof1)
                expect(result1).to.equal(false);
    
                const proof2 = this.merkleTree.getHexProof(this.elems[1]);
                const result2 = await this.yayVesting.checkClaim(this.balances[0][0], this.balances[1][1], this.balances[1][2], proof2)
                expect(result2).to.equal(false);
            });
        });

        describe('claim', function () {
            it('negative cases', async function () {
                const proof1 = this.merkleTree.getHexProof(this.elems[0]);
                await expectRevert(
                    this.yayVesting.claim(this.balances[1][1], this.balances[1][2], proof1, {from: accounts[0]}),
                    'YayVesting: Invalid proof or wrong data',
                );
                await expectRevert(
                    this.yayVesting.claim(this.balances[0][1], this.balances[0][2], proof1, {from: accounts[1]}),
                    'YayVesting: Invalid proof or wrong data',
                );

                const proof2 = this.merkleTree.getHexProof(this.elems[4]);
                await expectRevert(
                    this.yayVesting.claim(this.balances[4][1], this.balances[4][2], proof2, {from: accounts[4]}),
                    'YayVesting: Invalid category',
                );

                const proof3 = this.merkleTree.getHexProof(this.elems[5]);
                await expectRevert(
                    this.yayVesting.claim(this.balances[5][1], this.balances[5][2], proof3, {from: accounts[5]}),
                    'YayVesting: Invalid amount',
                );
            });
            it('after deadline', async function () {
                const proof = this.merkleTree.getHexProof(this.elems[0]);
                await advanceBlockAndSetTime(this.tgeTimestamp + 30*DAY*15 + DAY);
        
                let result = (await this.yayVesting.claim.call(this.balances[0][1], this.balances[0][2], proof, {from: accounts[0]})).toString();
                let expectedReward = (new BN("10000")).toString();
                await assert.equal(
                    result,
                    expectedReward
                );
                await this.yayVesting.claim(this.balances[0][1], this.balances[0][2], proof, {from: accounts[0]});
                expect((await this.token.balanceOf.call(accounts[0])).toString()).to.equal(expectedReward);
        
                await expectRevert(
                    this.yayVesting.claim(this.balances[0][1], this.balances[0][2], proof, {from: accounts[0]}),
                    'YayVesting: no tokens to claim',
                );
    
                await advanceBlockAndSetTime(this.tgeTimestamp + 30*DAY*30 + DAY);
                await expectRevert(
                    this.yayVesting.claim(this.balances[0][1], this.balances[0][2], proof, {from: accounts[0]}),
                    'YayVesting: no tokens to claim',
                );
            });
            describe('v24month specifics', function () {
                it('after deadline', async function () {
                    const proof = this.merkleTree.getHexProof(this.elems[6]);
                    await advanceBlockAndSetTime(this.tgeTimestamp + 30*DAY*23 + DAY);
            
                    let result = (await this.yayVesting.claim.call(this.balances[6][1], this.balances[6][2], proof, {from: accounts[6]})).toString();
                    let expectedReward = (new BN("100000")).toString();
                    await assert.equal(
                        result,
                        expectedReward
                    );
                    await this.yayVesting.claim(this.balances[6][1], this.balances[6][2], proof, {from: accounts[6]});
                    expect((await this.token.balanceOf.call(accounts[6])).toString()).to.equal(expectedReward);
            
                    await expectRevert(
                        this.yayVesting.claim(this.balances[6][1], this.balances[6][2], proof, {from: accounts[6]}),
                        'YayVesting: no tokens to claim',
                    );
        
                    await advanceBlockAndSetTime(this.tgeTimestamp + 30*DAY*30 + DAY);
                    await expectRevert(
                        this.yayVesting.claim(this.balances[6][1], this.balances[6][2], proof, {from: accounts[6]}),
                        'YayVesting: no tokens to claim',
                    );
                });
                it('before deadline', async function () {
                    const proof = this.merkleTree.getHexProof(this.elems[6]);
                    await advanceBlockAndSetTime(this.tgeTimestamp + 30*DAY*22 + DAY);
            
                    let result = (await this.yayVesting.claim.call(this.balances[6][1], this.balances[6][2], proof, {from: accounts[6]})).toString();
                    let expectedReward = (new BN("95910")).toString();
                    await assert.equal(
                        result,
                        expectedReward
                    );
                    await this.yayVesting.claim(this.balances[6][1], this.balances[6][2], proof, {from: accounts[6]});
                    expect((await this.token.balanceOf.call(accounts[6])).toString()).to.equal(expectedReward);
            
                    await expectRevert(
                        this.yayVesting.claim(this.balances[6][1], this.balances[6][2], proof, {from: accounts[6]}),
                        'YayVesting: no tokens to claim',
                    );
        
                    await advanceBlockAndSetTime(this.tgeTimestamp + 30*DAY*23 + DAY);
                    result = (await this.yayVesting.claim.call(this.balances[6][1], this.balances[6][2], proof, {from: accounts[6]})).toString();
                    expectedReward = (new BN("4090")).toString();
                    await assert.equal(
                        result,
                        expectedReward
                    );
                });
            });
            describe('legasy tests', function () {
                it('before TGE', async function () {
                    const proof = this.merkleTree.getHexProof(this.elems[0]);
                    await expectRevert(
                        this.yayVesting.claim(this.balances[0][1], this.balances[0][2], proof, {from: accounts[0]}),
                        'YayVesting: TGE has not started yet',
                    );
                });
                it('immediately after TGE', async function () {
                    const proof = this.merkleTree.getHexProof(this.elems[0]);
                    await advanceTimeAndBlock(5);
    
                    let result = (await this.yayVesting.claim.call(this.balances[0][1], this.balances[0][2], proof, {from: accounts[0]})).toString();
                    await assert.equal(
                        result,
                        new BN("1000")
                    );
                    await this.yayVesting.claim(this.balances[0][1], this.balances[0][2], proof, {from: accounts[0]});
                    expect((await this.token.balanceOf.call(accounts[0])).toString()).to.equal("1000");
    
                    await expectRevert(
                        this.yayVesting.claim(this.balances[0][1], this.balances[0][2], proof, {from: accounts[0]}),
                        'YayVesting: no tokens to claim',
                    );
                });
                it('step 1', async function () {
                    const proof = this.merkleTree.getHexProof(this.elems[0]);
                    await advanceBlockAndSetTime(this.tgeTimestamp + 30*DAY);
    
                    let result = (await this.yayVesting.claim.call(this.balances[0][1], this.balances[0][2], proof, {from: accounts[0]})).toString();
                    await assert.equal(
                        result,
                        (new BN("1600")).toString()
                    );
                    await this.yayVesting.claim(this.balances[0][1], this.balances[0][2], proof, {from: accounts[0]});
                    expect((await this.token.balanceOf.call(accounts[0])).toString()).to.equal("1600");
    
                    await expectRevert(
                        this.yayVesting.claim(this.balances[0][1], this.balances[0][2], proof, {from: accounts[0]}),
                        'YayVesting: no tokens to claim',
                    );
                });
            });
        });
    });
});