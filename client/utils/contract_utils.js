import { ethers } from 'ethers';
import MyToken from '../TuffGuysNFT.json';

export async function mintOnContract() {
  try {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, MyToken.abi, signer);
    const address = await signer.getAddress();
    const tx = await contract.safeMint(address);
    console.log(tx);
    const result = await tx.wait();
    console.log(result);
    return result;
  } catch (error) {
    console.error(error);
  }
}
