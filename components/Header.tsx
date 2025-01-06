"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "./ui/button";
import {
  Menu,
  Coins,
  Leaf,
  Search,
  Bell,
  User,
  ChevronDown,
  LogIn,
  LogOut,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Badge } from "./ui/badge";
import { Web3Auth } from "@web3auth/modal";
import { CHAIN_NAMESPACES, IProvider, WEB3AUTH_NETWORK } from "@web3auth/base";
import { EthereumPrivateKeyProvider } from "@web3auth/ethereum-provider";
import {
  createUser,
  getUnreadNotifications,
  getUserBalance,
  getUserByEmail,
  markNotificationAsRead,
} from "@/utils/db/actions";
import { get } from "http";

const clientId = process.env.WEB3_AUTH_CLIENT_ID;

const chainConfig = {
  chainNamespace: CHAIN_NAMESPACES.EIP155,
  chainId: "0xaa36a7",
  rpcTarget: "https://rpc.ankr.com/eth_sepolia",
  displayName: "Sepolia testnet",
  blockExplorerUrl: "https://sepolia.etherscan.io",
  ticker: "ETH",
  tickerName: "Ethereum",
  logo: "https://assets.web3auth.io/evm-chains/sepolia.png",
};

const privateKeyProvider = new EthereumPrivateKeyProvider({
  config: { chainConfig },
});

const web3Auth = new Web3Auth({
  clientId,
  web3AuthNetwork: WEB3AUTH_NETWORK.TESTNET,
  privateKeyProvider,
});

interface HeaderProps {
  onMenuClick: () => void;
  totalEarnings: number;
}

export default function Header({ onMenuClick, totalEarnings }: HeaderProps) {
  const [provider, setProvider] = useState<IProvider | null>(null);
  const [loggedIn, setLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<any>(null);
  const pathname = usePathname();
  const [notification, setNotification] = useState<Notification[]>([]);
  const [balance, setBalance] = useState<number>(0);

  useEffect(() => {
    const init = async () => {
      try {
        await web3Auth.initModal();
        setProvider(web3Auth.provider);
        if (web3Auth.connected) {
          setLoggedIn(true);
          const user = await web3Auth.getUserInfo();
          setUserInfo(user);

          if (user.email) {
            localStorage.setItem("userEmail", user.email);
            try {
              await createUser(user.email, user.name || "anonymous user");
            } catch (error) {
              console.error("error creating user", error);
            }
          }
        }
      } catch (error) {
        console.error("error initializing web3Auth", error);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (userInfo && userInfo.email) {
        const user = await getUserByEmail(userInfo.email);
        if (user) {
          const unreadNotifications = await getUnreadNotifications(user.id);
          setNotification(unreadNotifications);
        }
      }
    };
    fetchNotifications();

    const notificationInterval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(notificationInterval);
  }, [userInfo]);

  useEffect(() => {
    const fetchUserbalance = async () => {
      if (userInfo && userInfo.email) {
        const user = await getUserByEmail(userInfo.email);
        if (user) {
          const userbalance = await getUserBalance(user.id);
          setBalance(userbalance);
        }
      }
    };
    fetchUserbalance();

    const handlebalanceUpdaate = (event: CustomEvent) => {
      setBalance(event.detail);
    };
    window.addEventListener(
      "balanceUpdate",
      handlebalanceUpdaate as EventListener
    );

    return () => {
      window.removeEventListener(
        "balanceUpdate",
        handlebalanceUpdaate as EventListener
      );
    };
  }, [userInfo]);

  const login = async () => {
    if (!web3Auth) {
      console.log("web3Auth not initialized");
      return;
    }
    try {
      const web3AuthProvider = await web3Auth.connect();
      setProvider(web3AuthProvider);
      setLoggedIn(true);
      const user = await web3Auth.getUserInfo();
      setUserInfo(user);
      if(user.email){
        localStorage.setItem('userEmail', user.email);
        try{
            await createUser(user.email, user.name || 'anonymous user');

        }catch(error){
            console.error('error creating user', error);
        }
      }
    } catch (error) {
      console.error("error logging in", error);
    }
  };

  const logout = async () => {
    if(!web3Auth){
        console.log('web3Auth not initialized');
        return;
    }
    try {
        await web3Auth.logout();
        setProvider(null);
        setLoggedIn(false);
        setUserInfo(null);
    } catch (error) {
        console.error('error logging out', error);

    };
};

const getUserInfo = async () => {
    if (web3Auth.connected) {
        const user = await web3Auth.getUserInfo();
        setUserInfo(user);

        if (user.email) {
            localStorage.setItem('userEmail', user.email);
            try {
                await createUser(user.email, user.name || 'anonymous user');
            } catch (error) {
                console.error('error creating user', error);
            }
        }
    }
};

const handleNotificationClick = async (notificationId: number) => {
    await markNotificationAsRead(notificationId);
}
if (loading) {
    return <div>loading web3 auth...</div>
}

return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 py-2">
            <div className="flex items-center">
                <Button variant = 'ghost' size='icon' className="mr-2 md:mr-4" onClick={onMenuClick}>
                    <Menu className="w-6 h-6" />
                </Button>
            </div>

        </div>
    </header>
)

}




