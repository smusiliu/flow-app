'use client';
import Head from 'next/head'
import '../flow/config';
import { useState, useEffect } from 'react';
import * as fcl from '@onflow/fcl';

export default function Home() {

    const [user, setUser] = useState({ loggedIn: null })
    const [name, setName] = useState('')
    const [transactionStatus, setTransactionStatus] = useState(null) // NEW

    useEffect(() => fcl.currentUser.subscribe(setUser), [])

    const sendQuery = async () => {
        const profile = await fcl.query({
            cadence: `
                import Profile from 0xProfile
        
                pub fun main(address: Address): Profile.ReadOnly? {
                    return Profile.read(address)
                }
        `,
            args: (arg, t) => [arg(user.addr, t.Address)]
        })

        setName(profile?.name ?? 'No Profile')
    }

    const initAccount = async () => {
        const transactionId = await fcl.mutate({
            cadence: `
                import Profile from 0xProfile
        
                transaction {
                    prepare(account: AuthAccount) {
                    // Only initialize the account if it hasn't already been initialized
                    if (!Profile.check(account.address)) {
                        // This creates and stores the profile in the user's account
                        account.save(<- Profile.new(), to: Profile.privatePath)
        
                        // This creates the public capability that lets applications read the profile's info
                        account.link<&Profile.Base{Profile.Public}>(Profile.publicPath, target: Profile.privatePath)
                    }
                }
          }
        `,
            payer: fcl.authz,
            proposer: fcl.authz,
            authorizations: [fcl.authz],
            limit: 50
        })

        const transaction = await fcl.tx(transactionId).onceSealed()

        console.log(transaction)
    }

    // NEW
    const executeTransaction = async () => {
        const transactionId = await fcl.mutate({
            cadence: `
                import Profile from 0xProfile
        
                transaction(name: String) {
                    prepare(account: AuthAccount) {
                    account
                        .borrow<&Profile.Base{Profile.Owner}>(from: Profile.privatePath)!
                        .setName(name)
                    }
                }
        `,
            args: (arg, t) => [arg("MLH", t.String)],
            payer: fcl.authz,
            proposer: fcl.authz,
            authorizations: [fcl.authz],
            limit: 50
        })

        fcl.tx(transactionId).subscribe(res => setTransactionStatus(res.status))
    }

    const AuthedState = () => {
        return (
            <div className='max-w-4xl mx-auto'>
                <div className='flex flex-row items-center justify-between py-4'>
                    <div>
                        <span> Flow App </span>
                    </div>

                    <div className='flex flex-row items-center justify-between space-x-5'>
                        <button className='p-2 px-5 rounded-md bg-blue-600 shadow-md text-sm font-normal' onClick={fcl.unauthenticate}>Log Out</button>
                    </div>
                </div>

                <div className='min-h-[70vh] flex flex-col  justify-center'>
                    <p>Address: {user?.addr ?? "No Address"}</p>
                    <p>Profile Name: {name ?? "--"}</p>
                    <p>Transaction Status: {transactionStatus ?? "--"}</p> {/* NEW */}

                    <div className='grid grid-cols-3 gap-8 mt-12 mx-auto'>
                        <button className='bg-blue-600 px-3 p-2 rounded-md shadow-md text-sm' onClick={sendQuery}>Send Query</button>
                        <button className='bg-blue-600 px-3 p-2 rounded-md shadow-md text-sm' onClick={initAccount}>Init Account</button>
                        <button className='bg-blue-600 px-3 p-2 rounded-md shadow-md text-sm' onClick={executeTransaction}>Execute Transaction</button> {/* NEW */}
                    </div>
                </div>
            </div>
        )
    }

    const UnauthenticatedState = () => {
        return (
            <div className='max-w-4xl mx-auto'>
                <div className='flex flex-row items-center justify-between py-4'>
                    <div>
                        <span> Flow App </span>
                    </div>

                    <div className='flex flex-row items-center justify-between space-x-5'>
                        <button className='border border-gray-700 p-2 px-5 rounded-md text-sm font-normal' onClick={fcl.logIn}>Log In</button>
                        <button className='p-2 px-5 rounded-md bg-blue-600 shadow-md text-sm font-normal' onClick={fcl.signUp}>Sign Up</button>
                    </div>
                </div>

                <div className='min-h-[80vh] flex flex-col items-center justify-center text-center'>
                    <h1 className='text-6xl font-bold text-gray-200'> My First Application with Flow </h1>
                    <p className='text-base text-gray-300 my-5 w-[80%]'> Interacting with an existing smart contract on Flow’s testnet known as the Profile Contract. Using this contract, I was able to create a new user profile and edit the profile information using the Flow Client Library (FCL). </p>

                    <button className='p-2 px-16 mt-3 rounded-md bg-blue-600 shadow-md text-sm font-normal' onClick={fcl.signUp}>Sign Up</button>
                </div>
            </div>
        )
    }

    return (
        <div>
            <Head>
                <title>FCL Quickstart with NextJS</title>
                <meta name="description" content="My first web3 app on Flow!" />
                <link rel="icon" href="/favicon.png" />
            </Head>
            {/* <h1>Flow App</h1> */}
            {user.loggedIn
                ? <AuthedState />
                : <UnauthenticatedState />
            }
        </div>
    )
}


