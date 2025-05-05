"use server"

import bcrypt from "bcrypt";
import { eq } from 'drizzle-orm';
import { db } from "@/db";
import { users } from "@/db/schema";
import { User } from "@/db/schema";

// Hash a password
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

// Verify a password
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// Get user by email
export async function getUserByEmail(email: string): Promise<User | undefined> {
  const results = await db.select().from(users).where(eq(users.email, email));
  return results[0];
}

// Create a new user
export async function createUser(name: string, email: string, password: string): Promise<User> {
  const hashedPassword = await hashPassword(password);

  const [user] = await db.insert(users).values({
    name,
    email,
    passwordHash: hashedPassword,
  });

  const insertedUser = await db.select().from(users).where(eq(users.id, user.insertId));

  return insertedUser[0];
}

// Get user by ID
export async function getUserById(id: number): Promise<User | undefined> {
  const results = await db.select().from(users).where(eq(users.id, id));
  return results[0];
}

// Get all users
export async function getAllUsers(): Promise<User[]> {
  return db.select().from(users);
}

// Update user information
export async function updateUserInfo(
  userId: number,
  data: { name?: string; email?: string }
): Promise<User | null> {
  const [updatedUser] = await db
    .update(users)
    .set({
      name: data.name,
      email: data.email,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  const insertedUser = await db.select().from(users).where(eq(users.id, userId));

  return insertedUser[0] || null;
}

// Update user password
export async function updateUserPassword(
  userId: number,
  newPassword: string
): Promise<boolean> {
  try {
    const hashedPassword = await hashPassword(newPassword);

    await db
      .update(users)
      .set({
        passwordHash: hashedPassword,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    return true;
  } catch (error) {
    console.error("Error updating password:", error);
    return false;
  }
}

// Check if an email already exists (for registration)
export async function emailExists(email: string): Promise<boolean> {
  const results = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return results.length > 0;
}