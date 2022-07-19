import Head from 'next/head'
import { useState, useEffect } from 'react'
import { nftContractAddress } from '../config.js'
import { ethers } from 'ethers'
import axios from 'axios'
import Loader from 'react-loader-spinner'
import NFT from '../utils/TuffGuysNFT.json'

const mint = () => {
	const [mintedNFT, setMintedNFT] = useState(null)
	const [miningStatus, setMiningStatus] = useState(null)
	const [loadingState, setLoadingState] = useState(0)
	const [txError, setTxError] = useState(null)
	const [currentAccount, setCurrentAccount] = useState('')
	const [correctNetwork, setCorrectNetwork] = useState(false)
	const [name, setName] = useState('')
	const [description, setDescription] = useState('')
	const [attributes, setAttributes] = useState([])
	const [imageUrl, setImageUrl] = useState(null)
	const [uploading, setUploading] = useState(false)
	const [loading, setLoading] = useState(false)

	// Checks if wallet is connected
	const checkIfWalletIsConnected = async () => {
		const { ethereum } = window
		if (ethereum) {
			console.log('Got the ethereum object: ', ethereum)
		} else {
			console.log('No Wallet found. Connect Wallet')
		}

		const accounts = await ethereum.request({ method: 'eth_accounts' })

		if (accounts.length !== 0) {
			console.log('Found authorized Account: ', accounts[0])
			setCurrentAccount(accounts[0])
		} else {
			console.log('No authorized account found')
		}
	}

	// Calls Metamask to connect wallet on clicking Connect Wallet button
	const connectWallet = async () => {
		try {
			const { ethereum } = window

			if (!ethereum) {
				console.log('Metamask not detected')
				return
			}
			let chainId = await ethereum.request({ method: 'eth_chainId' })
			console.log('Connected to chain:' + chainId)

			const rinkebyChainId = '0x4'

			const devChainId = 1337
			const localhostChainId = `0x${Number(devChainId).toString(16)}`

			if (chainId !== rinkebyChainId && chainId !== localhostChainId) {
				alert('You are not connected to the Rinkeby Testnet!')
				return
			}

			const accounts = await ethereum.request({ method: 'eth_requestAccounts' })

			console.log('Found account', accounts[0])
			setCurrentAccount(accounts[0])
		} catch (error) {
			console.log('Error connecting to metamask', error)
		}
	}

	// Checks if wallet is connected to the correct network
	const checkCorrectNetwork = async () => {
		const { ethereum } = window
		let chainId = await ethereum.request({ method: 'eth_chainId' })
		console.log('Connected to chain:' + chainId)

		const rinkebyChainId = '0x4'

		const devChainId = 1337
		const localhostChainId = `0x${Number(devChainId).toString(16)}`

		if (chainId !== rinkebyChainId && chainId !== localhostChainId) {
			setCorrectNetwork(false)
		} else {
			setCorrectNetwork(true)
		}
	}
	const sendJSONtoIPFS = async (ImgHash) => {

		try {

			const resJSON = await axios({
				method: "post",
				url: "https://api.pinata.cloud/pinning/pinJsonToIPFS",
				data: {
					"name": name,
					"description": desc,
					"image": ImgHash
				},
				headers: {
					'pinata_api_key': `${process.env.REACT_APP_PINATA_API_KEY}`,
					'pinata_secret_api_key': `${process.env.REACT_APP_PINATA_API_SECRET}`,
				},
			});

			console.log("final ", `ipfs://${resJSON.data.IpfsHash}`)
			const tokenURI = `ipfs://${resJSON.data.IpfsHash}`;
			console.log("Token URI", tokenURI);
			//mintNFT(tokenURI, currentAccount)   // pass the winner
			mintCharacter()

		} catch (error) {
			console.log("JSON to IPFS: ")
			console.log(error);
		}


	}
	const sendFileToIPFS = async (e) => {

		if (imageUrl) {
			try {

				const formData = new FormData();
				formData.append("file", imageUrl);

				const resFile = await axios({
					method: "post",
					url: "https://api.pinata.cloud/pinning/pinFileToIPFS",
					data: formData,
					headers: {
						'pinata_api_key': `${process.env.REACT_APP_PINATA_API_KEY}`,
						'pinata_secret_api_key': `${process.env.REACT_APP_PINATA_API_SECRET}`,
						"Content-Type": "multipart/form-data"
					},
				});

				const ImgHash = `ipfs://${resFile.data.IpfsHash}`;
				console.log(ImgHash);
				//Take a look at your Pinata Pinned section, you will see a new file added to you list.   
				sendJSONtoIPFS(ImgHash)


			} catch (error) {
				console.log("Error sending File to IPFS: ")
				console.log(error)
			}
		}
	}
	// Creates transaction to mint NFT on clicking Mint Character button
	const mintCharacter = async () => {
		// all data is required to create an NFT
		if (!name && !description && attributes.length === 0 && !imageUrl) {
			return
		}

		// collect all data into an object
		const data = {
			name,
			image: imageUrl,
			description,
			attributes,
		}

		try {
			const { ethereum } = window

			if (ethereum) {
				const provider = new ethers.providers.Web3Provider(ethereum)
				const signer = provider.getSigner()
				const nftContract = new ethers.Contract(
					nftContractAddress,
					NFT.abi,
					signer
				)

				let nftTx = await nftContract.mint_giveaway(1)
				console.log('Mining....', nftTx.hash)
				setMiningStatus(0)

				let tx = await nftTx.wait()
				setLoadingState(1)
				console.log('Mined!', tx)
				let event = tx.events[0]
				let value = event.args[2]
				let tokenId = value.toNumber()

				console.log(
					`Mined, see transaction: https://rinkeby.etherscan.io/tx/${nftTx.hash}`
				)

				getMintedNFT(tokenId)
			} else {
				console.log("Ethereum object doesn't exist!")
			}
		} catch (error) {
			console.log('Error minting Tuff Guy', error)
			setTxError(error.message)
		}
	}

	// Gets the minted NFT data
	const getMintedNFT = async (tokenId) => {
		try {
			const { ethereum } = window

			if (ethereum) {
				const provider = new ethers.providers.Web3Provider(ethereum)
				const signer = provider.getSigner()
				const nftContract = new ethers.Contract(
					nftContractAddress,
					NFT.abi,
					signer
				)

				let tokenUri = await nftContract.tokenURI(tokenId)
				let data = await axios.get(tokenUri)
				let meta = data.data
				console.log("meta", meta)
				setMiningStatus(1)
				setMintedNFT(meta.image)
			} else {
				console.log("Ethereum object doesn't exist!")
			}
		} catch (error) {
			console.log(error)
			setTxError(error.message)
		}
	}
	// Gets the minted NFT data
	const fuseTuffGuy = async (tokenId) => {
		try {
			setFileImg("");
		} catch (error) {
			console.log(error)
		}
	}

	// simple function to remove an attribute
	function removeAttribute(index) {
		let newAttributes = []
		for (let i = 0; i < attributes.length; i++) {
			if (i == index) {
				continue
			}

			newAttributes.push(attributes[i])
		}
		setAttributes(newAttributes)
	}


	useEffect(() => {
		checkIfWalletIsConnected()
		checkCorrectNetwork()
	}, [])

	useEffect(() => {
		console.log(imageUrl)
	}, [imageUrl])

	return (
		<div className='flex flex-col items-center pt-32 bg-[#0B132B] text-[#d3d3d3] min-h-screen'>
			<Head>
				<title>Tuff Guys</title>
				<meta name='viewport' content='initial-scale=1.0, width=device-width' />
			</Head>
			<div className='trasition hover:rotate-180 hover:scale-105 transition duration-500 ease-in-out'>
				<svg
					xmlns='http://www.w3.org/2000/svg'
					width='60'
					height='60'
					fill='currentColor'
					viewBox='0 0 16 16'
				>
					<path d='M8.186 1.113a.5.5 0 0 0-.372 0L1.846 3.5 8 5.961 14.154 3.5 8.186 1.113zM15 4.239l-6.5 2.6v7.922l6.5-2.6V4.24zM7.5 14.762V6.838L1 4.239v7.923l6.5 2.6zM7.443.184a1.5 1.5 0 0 1 1.114 0l7.129 2.852A.5.5 0 0 1 16 3.5v8.662a1 1 0 0 1-.629.928l-7.185 2.874a.5.5 0 0 1-.372 0L.63 13.09a1 1 0 0 1-.63-.928V3.5a.5.5 0 0 1 .314-.464L7.443.184z' />
				</svg>
			</div>
			<h2 className='text-3xl font-bold mb-20 mt-12'>
				Mint Your Tuff Guy
			</h2>
			{currentAccount === '' ? (
				<button
					className='text-2xl font-bold py-3 px-12 bg-black shadow-lg shadow-[#6FFFE9] rounded-lg mb-10 hover:scale-105 transition duration-500 ease-in-out'
					onClick={connectWallet}
				>
					Connect Wallet
				</button>
			) : correctNetwork ? (
				<>
						{/* <form onSubmit={sendFileToIPFS}>
							<input type="file" onChange={(e) => setImageUrl(e.target.files[0])} required />
							<input type="text" onChange={(e) => setName(e.target.value)} placeholder='name' required value={name} />
							<input type="text" onChange={(e) => setDesc(e.target.value)} placeholder="desc" required value={desc} />
							<br />
							<button className='bttn_ui me-3' type='submit' >Mint NFT</button>
							<Link to="/system" style={{ textDecoration: "none" }}> <button className='bttn_ui mt-3' style={{ background: "#60e6ff", }}> Go to Admin Panal</button></Link>

						</form> */}
					<button
						className='text-2xl font-bold py-3 px-12 bg-black shadow-lg shadow-[#6FFFE9] rounded-lg mb-10 hover:scale-105 transition duration-500 ease-in-out'
						onClick={mintCharacter}
					>
						Mint
					</button>
				</>
			) : (
				<div className='flex flex-col justify-center items-center mb-20 font-bold text-2xl gap-y-3'>
					<div>----------------------------------------</div>
					<div>Please connect to the Rinkeby Testnet</div>
					<div>and reload the page</div>
					<div>----------------------------------------</div>
				</div>
			)}

			<div className='text-xl font-semibold mb-20 mt-4'>
				<a
					href={`https://rinkeby.rarible.com/collection/${nftContractAddress}`}
					target='_blank'
				>
					<span className='hover:underline hover:underline-offset-8 '>
						View Your Tuff Guys on Rarible
					</span>
				</a>
			</div>
			
			{/* Loading State */}
			{loadingState === 0 ? (
				miningStatus === 0 ? (
					txError === null ? (
						<div className='flex flex-col justify-center items-center'>
							<div className='text-lg font-bold'>
								Minting Your Tuff
							</div>
							<Loader
								className='flex justify-center items-center pt-12'
								type='TailSpin'
								color='#d3d3d3'
								height={40}
								width={40}
							/>
						</div>
					) : (
						<div className='text-lg text-red-600 font-semibold'>{txError}</div>
					)
				) : (
					<div></div>
				)
			) : (
				<div className='flex flex-col justify-center items-center'>
					<div className='font-semibold text-lg text-center mb-4'>
						Your Tuff Guys
					</div>
					<img
						src={mintedNFT}
						alt=''
						className='h-60 w-60 rounded-lg shadow-2xl shadow-[#6FFFE9] hover:scale-105 transition duration-500 ease-in-out'
					/>
				</div>
			)}
		</div>
	)
}

export default mint
