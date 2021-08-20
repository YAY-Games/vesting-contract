const YayVesting = artifacts.require("YayVesting");

async function main() {
  const yayVesting = await YayVesting.new(
    process.env["TOKEN_CONTRACT"],
    process.env["MERCLE_ROOT"],
    process.env["TGE_TIMESTAMP"],
  );
  await YayVesting.setAsDeployed(yayVesting);

  console.log("contract deployed: ", yayVesting.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });