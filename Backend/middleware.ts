import type { NextFunction, Request, Response } from "express";
import { createSupabaseClient } from "./client";
import { prisma } from "./db";

// Extend Express Request type to carry userId
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

const client = createSupabaseClient();

export async function middleware(req: Request, res: Response, next: NextFunction) {
    const token = req.headers.authorization;

    if (!token) {
        res.status(401).json({ message: "No authorization token provided" });
        return;
    }

    const { data, error } = await client.auth.getUser(token);
    const supabaseUser = data.user;

    if (error || !supabaseUser) {
        res.status(403).json({ message: "Invalid or expired token" });
        return;
    }

    const userId = supabaseUser.id;
    const email = supabaseUser.email!;
    const provider = supabaseUser.app_metadata?.provider === "google" ? "GOOGLE" : "GITHUB";
    const name = supabaseUser.user_metadata?.full_name ?? supabaseUser.user_metadata?.name ?? email;

    try {
        // Upsert: create the user record on first login, skip on subsequent requests
        await prisma.user.upsert({
            where: { supabaseId: userId },
            update: { email, name, provider },
            create: {
                id: userId,
                supabaseId: userId,
                email,
                provider,
                name,
            },
        });

        console.log(`[middleware] User synced to DB: ${email} (${userId})`);
    } catch (dbError) {
        // Log but don't block the request — the user is authenticated even if DB write fails
        console.error("[middleware] Failed to upsert user in DB:", dbError);
    }

    req.userId = userId;
    next();
}