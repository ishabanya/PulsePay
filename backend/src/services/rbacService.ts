import { db } from '../config/firebase';
import { createError } from '../middleware/errorHandler';

export type Permission = 
  | 'payments:read' | 'payments:write' | 'payments:delete'
  | 'customers:read' | 'customers:write' | 'customers:delete'
  | 'transactions:read' | 'transactions:write' | 'transactions:delete'
  | 'reports:read' | 'reports:write'
  | 'audit:read' | 'audit:write'
  | 'admin:read' | 'admin:write'
  | 'mfa:manage'
  | 'compliance:read' | 'compliance:write'
  | 'users:read' | 'users:write' | 'users:delete';

export type Role = 'user' | 'admin' | 'accountant' | 'support' | 'compliance_officer';

export interface RoleDefinition {
  name: Role;
  permissions: Permission[];
  description: string;
  isDefault?: boolean;
}

export interface UserRole {
  userId: string;
  roles: Role[];
  permissions: Permission[]; // Additional permissions beyond role
  assignedBy: string;
  assignedAt: Date;
  expiresAt?: Date;
}

export class RBACService {
  private static roleDefinitions: Record<Role, RoleDefinition> = {
    user: {
      name: 'user',
      description: 'Standard user with basic payment functionality',
      isDefault: true,
      permissions: [
        'payments:read', 'payments:write',
        'customers:read', 'customers:write',
        'transactions:read',
        'reports:read',
        'mfa:manage'
      ]
    },
    admin: {
      name: 'admin',
      description: 'Administrator with full system access',
      permissions: [
        'payments:read', 'payments:write', 'payments:delete',
        'customers:read', 'customers:write', 'customers:delete',
        'transactions:read', 'transactions:write', 'transactions:delete',
        'reports:read', 'reports:write',
        'audit:read', 'audit:write',
        'admin:read', 'admin:write',
        'mfa:manage',
        'compliance:read', 'compliance:write',
        'users:read', 'users:write', 'users:delete'
      ]
    },
    accountant: {
      name: 'accountant',
      description: 'Financial reporting and analysis access',
      permissions: [
        'payments:read',
        'customers:read',
        'transactions:read',
        'reports:read', 'reports:write',
        'audit:read',
        'compliance:read',
        'mfa:manage'
      ]
    },
    support: {
      name: 'support',
      description: 'Customer support with limited access',
      permissions: [
        'payments:read',
        'customers:read', 'customers:write',
        'transactions:read',
        'reports:read',
        'mfa:manage'
      ]
    },
    compliance_officer: {
      name: 'compliance_officer',
      description: 'Compliance monitoring and reporting',
      permissions: [
        'payments:read',
        'customers:read',
        'transactions:read',
        'reports:read',
        'audit:read', 'audit:write',
        'compliance:read', 'compliance:write',
        'mfa:manage'
      ]
    }
  };

  static async assignRole(userId: string, role: Role, assignedBy: string, expiresAt?: Date): Promise<void> {
    try {
      const userRoleDoc = await db.collection('userRoles').doc(userId).get();
      let userRole: UserRole;

      if (userRoleDoc.exists) {
        userRole = userRoleDoc.data() as UserRole;
        // Add role if not already present
        if (!userRole.roles.includes(role)) {
          userRole.roles.push(role);
        }
      } else {
        userRole = {
          userId,
          roles: [role],
          permissions: [],
          assignedBy,
          assignedAt: new Date(),
          expiresAt
        };
      }

      userRole.assignedBy = assignedBy;
      userRole.assignedAt = new Date();
      if (expiresAt) {
        userRole.expiresAt = expiresAt;
      }

      await db.collection('userRoles').doc(userId).set(userRole);
    } catch (error) {
      console.error('Error assigning role:', error);
      throw createError('Failed to assign role', 500);
    }
  }

  static async removeRole(userId: string, role: Role): Promise<void> {
    try {
      const userRoleDoc = await db.collection('userRoles').doc(userId).get();
      
      if (!userRoleDoc.exists) {
        return; // No roles to remove
      }

      const userRole = userRoleDoc.data() as UserRole;
      userRole.roles = userRole.roles.filter(r => r !== role);

      if (userRole.roles.length === 0) {
        // If no roles left, assign default user role
        userRole.roles = ['user'];
      }

      await db.collection('userRoles').doc(userId).set(userRole);
    } catch (error) {
      console.error('Error removing role:', error);
      throw createError('Failed to remove role', 500);
    }
  }

  static async grantPermission(userId: string, permission: Permission, grantedBy: string): Promise<void> {
    try {
      const userRoleDoc = await db.collection('userRoles').doc(userId).get();
      let userRole: UserRole;

      if (userRoleDoc.exists) {
        userRole = userRoleDoc.data() as UserRole;
        if (!userRole.permissions.includes(permission)) {
          userRole.permissions.push(permission);
        }
      } else {
        userRole = {
          userId,
          roles: ['user'], // Default role
          permissions: [permission],
          assignedBy: grantedBy,
          assignedAt: new Date()
        };
      }

      await db.collection('userRoles').doc(userId).set(userRole);
    } catch (error) {
      console.error('Error granting permission:', error);
      throw createError('Failed to grant permission', 500);
    }
  }

  static async revokePermission(userId: string, permission: Permission): Promise<void> {
    try {
      const userRoleDoc = await db.collection('userRoles').doc(userId).get();
      
      if (!userRoleDoc.exists) {
        return;
      }

      const userRole = userRoleDoc.data() as UserRole;
      userRole.permissions = userRole.permissions.filter(p => p !== permission);

      await db.collection('userRoles').doc(userId).set(userRole);
    } catch (error) {
      console.error('Error revoking permission:', error);
      throw createError('Failed to revoke permission', 500);
    }
  }

  static async getUserPermissions(userId: string): Promise<Permission[]> {
    try {
      const userRoleDoc = await db.collection('userRoles').doc(userId).get();
      
      if (!userRoleDoc.exists) {
        // Return default user permissions
        return this.roleDefinitions.user.permissions;
      }

      const userRole = userRoleDoc.data() as UserRole;
      
      // Check if role assignment has expired
      if (userRole.expiresAt && (userRole.expiresAt instanceof Date ? userRole.expiresAt : (userRole.expiresAt as any)?.toDate?.()) < new Date()) {
        return this.roleDefinitions.user.permissions;
      }

      // Combine permissions from all roles
      const rolePermissions = userRole.roles.flatMap(role => 
        this.roleDefinitions[role]?.permissions || []
      );

      // Add individual permissions
      const allPermissions = [...rolePermissions, ...userRole.permissions];
      
      // Remove duplicates
      return [...new Set(allPermissions)];
    } catch (error) {
      console.error('Error getting user permissions:', error);
      return this.roleDefinitions.user.permissions; // Fallback to default
    }
  }

  static async hasPermission(userId: string, permission: Permission): Promise<boolean> {
    try {
      const permissions = await this.getUserPermissions(userId);
      return permissions.includes(permission);
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  }

  static async getUserRoles(userId: string): Promise<{ roles: Role[]; permissions: Permission[] }> {
    try {
      const userRoleDoc = await db.collection('userRoles').doc(userId).get();
      
      if (!userRoleDoc.exists) {
        return { roles: ['user'], permissions: this.roleDefinitions.user.permissions };
      }

      const userRole = userRoleDoc.data() as UserRole;
      const permissions = await this.getUserPermissions(userId);
      
      return { roles: userRole.roles, permissions };
    } catch (error) {
      console.error('Error getting user roles:', error);
      return { roles: ['user'], permissions: this.roleDefinitions.user.permissions };
    }
  }

  static getRoleDefinitions(): Record<Role, RoleDefinition> {
    return this.roleDefinitions;
  }

  static async createCustomRole(
    name: string, 
    permissions: Permission[], 
    description: string,
    createdBy: string
  ): Promise<void> {
    try {
      const customRole = {
        name,
        permissions,
        description,
        isCustom: true,
        createdBy,
        createdAt: new Date()
      };

      await db.collection('customRoles').doc(name).set(customRole);
    } catch (error) {
      console.error('Error creating custom role:', error);
      throw createError('Failed to create custom role', 500);
    }
  }

  static async listAllUsers(): Promise<Array<{ userId: string; roles: Role[]; permissions: Permission[] }>> {
    try {
      const snapshot = await db.collection('userRoles').get();
      const users = [];

      for (const doc of snapshot.docs) {
        const userRole = doc.data() as UserRole;
        const permissions = await this.getUserPermissions(userRole.userId);
        
        users.push({
          userId: userRole.userId,
          roles: userRole.roles,
          permissions
        });
      }

      return users;
    } catch (error) {
      console.error('Error listing users:', error);
      throw createError('Failed to list users', 500);
    }
  }
}