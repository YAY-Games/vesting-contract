require('@openzeppelin/test-helpers');

const { MerkleTree } = require('merkletreejs');
const keccak256 = require('keccak256');

const { expect } = require('chai');
const { BN, expectRevert } = require('@openzeppelin/test-helpers');
const { advanceTime, advanceBlockAndSetTime, advanceBlock, advanceTimeAndBlock, takeSnapshot, revertToSnapShot} = require('./helpers/standingTheTime');

const ERC20Mock = artifacts.require('ERC20Mock');
const YayVestingMock = artifacts.require('YayVestingMock');

contract('YayVesting', function (accounts) {
    before(function() {
        this.balances = [
            [accounts[0], 1, new BN('10000')],
            [accounts[1], 2, new BN('15000')],
            [accounts[2], 3, new BN('20000')],
            [accounts[3], 4, new BN('30000')],
        ];
        
        this.elems = [];
        this.balances.forEach(element => {
            let hash = web3.utils.soliditySha3(element[0], element[1], element[2]);
            this.elems.push(hash);
        });

        this.merkleTree = new MerkleTree(this.elems, keccak256, { hashLeaves: false, sortPairs: true });

        this.merkleRoot = this.merkleTree.getHexRoot();
    });

    beforeEach(async function () {
        this.totalTokens = web3.utils.toWei("1000","ether");
        this.token = await ERC20Mock.new("Test", "TEST", this.totalTokens);
        
        this.tgeTimestamp = (await web3.eth.getBlock('latest')).timestamp + 5;
        this.yayVesting = await YayVestingMock.new(
            this.token.address,
            this.merkleRoot,
            this.tgeTimestamp,
            10,
            20,
            30,
            40
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
        await advanceTimeAndBlock(15);

        let result = (await this.yayVesting.claim.call(this.balances[0][1], this.balances[0][2], proof, {from: accounts[0]})).toString();
        await assert.equal(
            result,
            new BN("1600")
        );
        await this.yayVesting.claim(this.balances[0][1], this.balances[0][2], proof, {from: accounts[0]});
        expect((await this.token.balanceOf.call(accounts[0])).toString()).to.equal("1600");

        await expectRevert(
            this.yayVesting.claim(this.balances[0][1], this.balances[0][2], proof, {from: accounts[0]}),
            'YayVesting: no tokens to claim',
        );
    });
    it('after deadline', async function () {
        const proof = this.merkleTree.getHexProof(this.elems[0]);
        await advanceTimeAndBlock(500);

        let result = (await this.yayVesting.claim.call(this.balances[0][1], this.balances[0][2], proof, {from: accounts[0]})).toString();
        await assert.equal(
            result,
            new BN("10000")
        );
        await this.yayVesting.claim(this.balances[0][1], this.balances[0][2], proof, {from: accounts[0]});
        expect((await this.token.balanceOf.call(accounts[0])).toString()).to.equal("10000");

        await expectRevert(
            this.yayVesting.claim(this.balances[0][1], this.balances[0][2], proof, {from: accounts[0]}),
            'YayVesting: no tokens to claim',
        );
    });

  });

//     it('returns false for an invalid Merkle proof', async function () {
//       const correctElements = ['a', 'b', 'c'];
//       const correctMerkleTree = new MerkleTree(correctElements, keccak256, { hashLeaves: true, sortPairs: true });

//       const correctRoot = correctMerkleTree.getHexRoot();

//       const correctLeaf = keccak256(correctElements[0]);

//       const badElements = ['d', 'e', 'f'];
//       const badMerkleTree = new MerkleTree(badElements);

//       const badProof = badMerkleTree.getHexProof(badElements[0], keccak256, { hashLeaves: true, sortPairs: true });

//       expect(await this.merkleProof.verify(badProof, correctRoot, correctLeaf)).to.equal(false);
//     });

//     it('returns false for a Merkle proof of invalid length', async function () {
//       const elements = ['a', 'b', 'c'];
//       const merkleTree = new MerkleTree(elements, keccak256, { hashLeaves: true, sortPairs: true });

//       const root = merkleTree.getHexRoot();

//       const leaf = keccak256(elements[0]);

//       const proof = merkleTree.getHexProof(leaf);
//       const badProof = proof.slice(0, proof.length - 5);

//       expect(await this.merkleProof.verify(badProof, root, leaf)).to.equal(false);
    // });
//   });
});