import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { db } from "@/lib/db";
const secret = new TextEncoder().encode(process.env.AUTH_SECRET || "development-only-change-this-secret-32chars");
export type SessionUser = { id:string; email:string; name:string; roleCode:string; organizationId:string|null; organizationName:string|null };
export async function createSession(user:SessionUser) {
  const token = await new SignJWT(user).setProtectedHeader({alg:"HS256"}).setIssuedAt().setExpirationTime("8h").sign(secret);
  (await cookies()).set("spenddesk_session",token,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:8*60*60});
}
export async function getSession():Promise<SessionUser|null>{
  const token=(await cookies()).get("spenddesk_session")?.value;if(!token)return null;
  try { const {payload}=await jwtVerify(token,secret); return payload as unknown as SessionUser; } catch{return null;}
}
export async function requireUser(){const u=await getSession();if(!u)throw new Error("UNAUTHENTICATED");return u;}
export async function logout(){(await cookies()).delete("spenddesk_session");}
