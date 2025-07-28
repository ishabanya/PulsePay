const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.applicationDefault()
});

const db = admin.firestore();

async function createTestTransactions() {
  const userId = 'zRC67lm6KOOjEeW0IHGPVVM0eVt2';
  const userEmail = 'test@example.com';
  const userName = 'Test User';

  const testTransactions = [
    {
      userId,
      amount: 2500,
      currency: 'USD',
      status: 'succeeded',
      type: 'payment',
      description: 'Coffee subscription',
      customerEmail: userEmail,
      customerName: userName,
      stripePaymentIntentId: `pi_test_${Date.now()}_1`,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      userId,
      amount: 5000,
      currency: 'USD',
      status: 'succeeded',
      type: 'payment',
      description: 'Monthly software subscription',
      customerEmail: userEmail,
      customerName: userName,
      stripePaymentIntentId: `pi_test_${Date.now()}_2`,
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
      updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
    },
    {
      userId,
      amount: 1200,
      currency: 'USD',
      status: 'pending',
      type: 'payment',
      description: 'Pending purchase',
      customerEmail: userEmail,
      customerName: userName,
      stripePaymentIntentId: `pi_test_${Date.now()}_3`,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
    },
    {
      userId,
      amount: 7500,
      currency: 'USD',
      status: 'succeeded',
      type: 'payment',
      description: 'E-commerce purchase',
      customerEmail: userEmail,
      customerName: userName,
      stripePaymentIntentId: `pi_test_${Date.now()}_4`,
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    }
  ];

  try {
    console.log(`Creating ${testTransactions.length} test transactions for user: ${userId}`);
    
    for (let i = 0; i < testTransactions.length; i++) {
      const transaction = testTransactions[i];
      const docRef = await db.collection('transactions').add(transaction);
      console.log(`✅ Created transaction ${i + 1}: ${docRef.id} - $${transaction.amount/100} (${transaction.status})`);
    }
    
    console.log('\n✅ All test transactions created successfully!');
    console.log('You should now see transactions in your dashboard.');
    
    // Verify the transactions were created
    const snapshot = await db.collection('transactions').where('userId', '==', userId).get();
    console.log(`\n📊 Total transactions for user ${userId}: ${snapshot.docs.length}`);
    
  } catch (error) {
    console.error('❌ Error creating test transactions:', error);
  }
}

createTestTransactions().then(() => {
  process.exit(0);
});