import { db } from '../config/firebase';
import { User } from '../types/index';

export class UserService {
  static async createOrUpdateUser(firebaseUser: any): Promise<User> {
    try {
      const userRef = db.collection('users').doc(firebaseUser.uid);
      const userDoc = await userRef.get();
      
      const userData: User = {
        id: firebaseUser.uid,
        email: firebaseUser.email,
        name: firebaseUser.displayName || '',
        role: 'user',
        timezone: 'UTC',
        preferredCurrency: 'USD',
        country: 'US',
        createdAt: userDoc.exists ? userDoc.data()?.createdAt : new Date(),
        updatedAt: new Date(),
        isActive: true,
        emailVerified: firebaseUser.emailVerified
      };

      // Only add stripeCustomerId if it exists
      if (userDoc.data()?.stripeCustomerId) {
        userData.stripeCustomerId = userDoc.data()?.stripeCustomerId;
      }

      if (!userDoc.exists) {
        // New user - create with default data
        await userRef.set(userData);
      } else {
        // Existing user - update
        await userRef.update({
          ...userData,
          createdAt: userDoc.data()?.createdAt // Keep original creation date
        });
      }

      return userData;
    } catch (error) {
      console.error('Error creating/updating user:', error);
      throw new Error('Failed to create or update user');
    }
  }

  static async getUserById(userId: string): Promise<User | null> {
    try {
      const userDoc = await db.collection('users').doc(userId).get();
      if (!userDoc.exists) {
        return null;
      }
      return userDoc.data() as User;
    } catch (error) {
      console.error('Error fetching user:', error);
      throw new Error('Failed to fetch user');
    }
  }


  static async updateUserPreferences(userId: string, preferences: Partial<User>): Promise<void> {
    try {
      await db.collection('users').doc(userId).update({
        ...preferences,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error updating user preferences:', error);
      throw new Error('Failed to update user preferences');
    }
  }
}