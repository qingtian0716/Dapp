const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("YourCollectible", function () {
  let yourCollectible;
  let owner;

  beforeEach(async function () {
    [owner] = await ethers.getSigners();
    
    const YourCollectible = await ethers.getContractFactory("YourCollectible");
    yourCollectible = await YourCollectible.deploy();
    await yourCollectible.waitForDeployment();
  });

  describe("成绩管理", function () {
    it("应该能够正确设置和获取学生成绩", async function () {
      const studentId = 1001;
      const subjectNames = ["数学", "英语", "物理"];
      const scores = [95, 88, 92];

      // 设置成绩
      await yourCollectible.set(studentId, subjectNames, scores);

      // 获取成绩
      const result = await yourCollectible.get(studentId);
      
      // 验证返回值
      expect(result.exists).to.be.true;
      expect(result.subjectNames).to.deep.equal(subjectNames);
      expect(result.scores.map(s => Number(s))).to.deep.equal(scores);
    });

    it("不存在的学生ID应返回exists为false", async function () {
      const nonExistentId = 9999;
      const result = await yourCollectible.get(nonExistentId);
      
      expect(result.exists).to.be.false;
      expect(result.subjectNames).to.be.an('array').that.is.empty;
      expect(result.scores).to.be.an('array').that.is.empty;
    });

    it("课程数量和成绩数量不匹配时应该失败", async function () {
      const studentId = 1002;
      const subjectNames = ["数学", "英语"];
      const scores = [95];  // 只有一个成绩

      await expect(
        yourCollectible.set(studentId, subjectNames, scores)
      ).to.be.revertedWith("Subject count and score count must match");
    });

    it("至少需要一个课程", async function () {
      const studentId = 1003;
      const subjectNames = [];
      const scores = [];

      await expect(
        yourCollectible.set(studentId, subjectNames, scores)
      ).to.be.revertedWith("At least one subject is required");
    });
  });
}); 