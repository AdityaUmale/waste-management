'use client'

import {useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "./ui/button";
import { Menu, Coins, Leaf, Search, Bell, User, ChevronDown, LogIn, LogOut} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Badge } from "./ui/badge";
import {Web3Auth} from "@web3auth/modal";
import { CHAIN_NAMESPACES, IProvider, WEB3AUTH_NETWORK } from "@web3auth/base";
import {EthereumPrivateKeyProvider} from "@web3auth/ethereum-provider";
import { createUser } from "@/utils/db/actions";

const clientID = process.env.WEB3_AUTH_CLIENT_ID 

const chainConfig = {
    chainNampespace:CHAIN_NAMESPACES.EIP155,
    chainId:'0xaa36a7',
    rpcTarget: 'https://rpc.ankr.com/eth_sepolia',
    displayName: 'Sepolia testnet',
    blockExplorerUrl: "https://sepolia.etherscan.io",
    ticker: 'ETH',
    tickerName: "Ethereum",
    logo: 'https://assets.web3auth.io/evm-chains/sepolia.png',
}

const privateKeyProvider = new EthereumPrivateKeyProvider({
    config: chainConfig,
})

const web3Auth = new Web3Auth({
    clientId,
    web3AuthNetwork: WEB3AUTH_NETWORK.TESTNET,
    privateKeyProvider
})

interface HeaderProps {
    onMenuClick: () => void;
    totalEarnings: number;
}

export default function Header({onMenuClick, totalEarnings}: HeaderProps) {

    const [provider, setProvider] = useState<IProvider | null>(null);
    const [loggedIn, setLoggedIn] = useState(false);
    const [loading, setLoading] = useState(true);
    const [userInfo, setUserInfo] = useState<any>(null);
    const pathname = usePathname();
    const [notificationCount, setNotificationCount] = useState<Notification[]>([]);
    const [balance, setBalance] = useState<number>(0);

    useEffect(() => {
        const init = async () => {
            try {
                await web3Auth.initModal();
                setProvider(web3Auth.provider);
                if(web3Auth.connected) {
                    setLoggedIn(true);
                    const user  = await web3Auth.getUserInfo();
                    setUserInfo(user);

                    if (user.email){
                        localStorage.setItem('userEmail', user.email);
                        try {

                            await createUser(user.email, user.name || 'anonymous user');
                        }catch (error){
                            console.error('error creating user', error);
                        }
                    }
                }
            }catch(error){
                console.error('error initializing web3Auth', error);

            } finally {
                setLoading(false);
            }
        }
        init();
    },[]);

    
}
