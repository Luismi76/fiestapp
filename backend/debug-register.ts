
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const email = `debug_${Date.now()}@test.com`;
    console.log(`Attempting to register user: ${email}`);

    try {
        const user = await prisma.$transaction(async (tx) => {
            console.log('Starting transaction...');
            const newUser = await tx.user.create({
                data: {
                    email,
                    password: 'hashed_password_placeholder',
                    name: 'Debug User',
                    age: 30,
                    city: 'Debug City',
                },
            });
            console.log('User created:', newUser.id);

            console.log('Creating wallet...');
            const wallet = await tx.wallet.create({
                data: {
                    userId: newUser.id,
                    balance: 0,
                },
            });
            console.log('Wallet created:', wallet.id);

            return newUser;
        });

        console.log('Transaction successful!');
        console.log('User:', user);
    } catch (error) {
        console.error('ERROR OCCURRED:');
        console.error(error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
