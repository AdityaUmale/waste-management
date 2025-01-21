import { db }from "./dbConfig";
import { Notifications, Users, Transactions, Reports, Rewards } from "./schema";
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

export async function createReport ( 
    userId: number,
    location: string,
    wasteType: string,
    amount: string,
    imageUrl?: string,
    verificationResult?: any
) {
    try {
        const [report] = await db.insert(Reports).values({
            userId, location, wasteType, amount, imageUrl, verificationResult, status: 'pending',
        }).returning().execute();

        const pointEarned = 10;
        //updateRewardPoints
        await updateRewardsPoints(userId, pointEarned);
        //createTransaction
        await createTransaction(userId, 'earned_report', pointEarned, 'Points earned for reporting waste');

        await createNotification(userId, `You've earned ${pointEarned} points for reporting waste!`, "reward");
        return report 


    } catch (e) {
        console.error("error creating report", e);
        return null;

    }
}

export async function updateRewardsPoints(userId: number, pointsToAdd: number) {
    try {
        const [updateReward] = await db.update(Rewards).set({
            points: sql`${Rewards.points} + ${pointsToAdd}`
        }).where(eq(Rewards.userId, userId)).returning().execute();
        return updateReward;
    } catch (e) {
        console.error("Error updating reward points", e);
        return null;

    }
}

export async function createTransaction(userId: number, type: 'earned_report' | 'earned_collect' | 'redeemed', amount: number, description:string) {
    try {
        const [transactions] = await db.insert(Transactions).values({
            userId, type, amount, description
        })
        .returning()
        .execute();
        return transactions;
    } catch (e) {
        console.error("Error creating transaction", e);
        throw e;
    }
}

export async function createNotification(userId: number, message: string, type: string) {
    try {
        const [notifications] = await db.insert(Notifications).values({userId,message,type}).returning().execute();
        return notifications
    } catch (e) {
        console.error('error creating notification', e)

    }
}

export async function getRecentReports(limit: number=10){
    try{
        const report = await db.select().from(Reports).orderBy(desc(Reports.createdAt)).limit(limit).execute();
    }catch(e){
        console.error('error fecthing recent reports', e);
        return [];
    }

}
