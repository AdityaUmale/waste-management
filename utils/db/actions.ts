import { db }from "./dbConfig";
import { Notifications, Users, Transactions } from "./schema";
import { eq, sql, and, desc } from 'drizzle-orm'

export async function createUser(email: string, name: string) {
    try {
        const [user] = await db.insert(Users).values({email,name}).returning().execute();
        return user;
    } catch(error) {
        console.error('error creating user', error);
        return null;
    }
}

export async function getUserByEmail(email:string ) {
    try {
        const [user] = await db.select().from(Users).where(eq(Users.email, email)).execute();
        return user;
    } catch (error) {
        console.error('error getting user by email', error);
        return null;
    }
}

export async function getUnreadNotifications(userId: number) {
    try {
        return await db.select().from(Notifications).where(and(eq(Notifications.userId, userId), eq(Notifications.isRead, false))).execute();

    } catch(error ){
        console.error('error getting unread notifications', error);
        return null;
    }
}

export async function getUserBalance(userId: number):Promise<number> {
    const transactions = await getRewardTransactions(userId) || [];
    if (!transactions) {
        return 0;
    }
    const balance = transactions.reduce((acc: number, transactions: any) => {
        return transactions.type.startsWith('earned') ? acc + transactions.amount : acc - transactions.amount;
    }, 0)
    return Math.max(balance, 0);
}

export async function getRewardTransactions(userId: number) {
    try {
        const transactions = await db.select({
            id: Transactions.id,
            type: Transactions.type,
            amaount: Transactions.amount,
            description: Transactions.description,
            date: Transactions.date,

        }).from(Transactions).where(eq(Transactions.userId, userId)).orderBy(desc(Transactions.date)).limit(10).execute();
        const formattedTransactions = transactions.map(t => ({
            ...t,
            date: t.date.toISOString().split('T')[0], //yyyy-mm-dd
        }))
        return formattedTransactions;
    }catch(error) {
        console.error('error getting reward transactions', error);
        return null;
    }
}

export async function markNotificationAsRead(notificationId: number) {
    try {
        await db.update(Notifications).set({isRead: true}).where(eq(Notifications.id, notificationId)).execute(); 
    } catch(error) {
        console.error('error marking notification as read', error);
        return null;
    }
}
