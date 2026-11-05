"use server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser, createSession, logout as clearSession } from "@/lib/auth";
import { assertCan } from "@/lib/permissions";
import { audit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function loginAction(form:FormData){
 const email=String(form.get("email")||"").trim().toLowerCase(), password=String(form.get("password")||"");
 const user=await db.user.findUnique({where:{email},include:{organization:true,roles:{where:{isActive:true},include:{role:true}}}});
 if(!user||user.status!=="ACTIVE"||!await bcrypt.compare(password,user.passwordHash)) throw new Error("Invalid email or password, or account is inactive.");
 const role=user.roles[0]?.role;if(!role)throw new Error("No active role assigned.");
 await createSession({id:user.id,email:user.email,name:user.firstName+" "+user.lastName,roleCode:role.code,organizationId:user.organizationId,organizationName:user.organization?.name??"Platform"});
 await db.auditLog.create({data:{organizationId:user.organizationId,actorId:user.id,action:"AUTH_LOGIN_SUCCESS",module:"AUTH",entityType:"USER",entityId:user.id,source:"WEB"}});
 redirect("/dashboard");
}
export async function logoutAction(){const u=await requireUser();await db.auditLog.create({data:{organizationId:u.organizationId,actorId:u.id,action:"AUTH_LOGOUT",module:"AUTH",entityType:"USER",entityId:u.id,source:"WEB"}});await clearSession();redirect("/login");}
export async function createOrganizationAction(form:FormData){
 const u=await requireUser();await assertCan("ORGANIZATION_LIST","CREATE",u);
 const schema=z.object({name:z.string().min(2),code:z.string().min(2).transform(v=>v.trim().toUpperCase().replace(/\s+/g,"_")),industry:z.string().optional(),email:z.string().email(),mcpEnabled:z.string().optional()});
 const v=schema.parse({name:form.get("name"),code:form.get("code"),industry:form.get("industry"),email:form.get("email"),mcpEnabled:form.get("mcpEnabled")});
 const org=await db.organization.create({data:{...v,mcpEnabled:v.mcpEnabled==="on"}});
 await db.auditLog.create({data:{actorId:u.id,action:"ORGANIZATION_CREATED",module:"ORGANIZATION",entityType:"ORGANIZATION",entityId:org.id,newValues:{code:org.code,mcpEnabled:org.mcpEnabled}}});revalidatePath("/organizations");
}
export async function createUserAction(form:FormData){
 const u=await requireUser();const orgId=u.roleCode==="SUPER_ADMIN"?String(form.get("organizationId")||""):u.organizationId;
 if(u.roleCode==="SUPER_ADMIN")await assertCan("USER_LIST","CREATE",u);else await assertCan("ORG_USER_LIST","CREATE",u);
 if(!orgId)throw new Error("Organization is required.");
 const email=String(form.get("email")||"").trim().toLowerCase(), roleCode=String(form.get("roleCode")||"EMPLOYEE");
 if(u.roleCode==="ORGANIZATION_ADMIN" && roleCode!=="EMPLOYEE") throw new Error("Organization Admin can assign only Employee role in this starter.");
 const role=await db.role.findFirst({where:{code:roleCode,organizationId:orgId,isActive:true,deleted:false}});
 if(!role)throw new Error("Selected role is not available for this organization.");
 const hash=await bcrypt.hash("Welcome123!",12);
 const user=await db.user.create({data:{organizationId:orgId,email,firstName:String(form.get("firstName")||""),lastName:String(form.get("lastName")||""),department:String(form.get("department")||"General"),status:"ACTIVE",passwordHash:hash,roles:{create:{roleId:role.id,isActive:true}}}});
 await db.auditLog.create({data:{organizationId:orgId,actorId:u.id,action:"USER_CREATED",module:"USER",entityType:"USER",entityId:user.id,newValues:{email,roleCode}}});revalidatePath("/users");
}
const requestSchema=z.object({title:z.string().min(3),category:z.string().min(1),amount:z.coerce.number().positive().max(100000000),currency:z.string().length(3),priority:z.enum(["LOW","NORMAL","HIGH","URGENT"]),vendor:z.string().optional(),justification:z.string().min(5),requiredBy:z.string().optional()});
export async function createRequestAction(form:FormData){
 const u=await requireUser();await assertCan("SPEND_REQUEST_CREATE","CREATE",u);
 if(!u.organizationId)throw new Error("Tenant required.");
 const v=requestSchema.parse({title:form.get("title"),category:form.get("category"),amount:form.get("amount"),currency:form.get("currency")||"INR",priority:form.get("priority")||"NORMAL",vendor:form.get("vendor"),justification:form.get("justification"),requiredBy:form.get("requiredBy")});
 const count=await db.spendRequest.count({where:{organizationId:u.organizationId}});
 const req=await db.$transaction(async tx=>{
  const r=await tx.spendRequest.create({data:{organizationId:u.organizationId!,requestNumber:`SD-${new Date().getFullYear()}-${String(count+1).padStart(5,"0")}`,requesterId:u.id,title:v.title,category:v.category,amount:v.amount,currency:v.currency.toUpperCase(),priority:v.priority,vendor:v.vendor,justification:v.justification,requiredBy:v.requiredBy?new Date(v.requiredBy):null,status:"PENDING_APPROVAL",source:"WEB"}});
  await tx.requestHistory.create({data:{organizationId:u.organizationId!,requestId:r.id,actorId:u.id,event:"REQUEST_SUBMITTED",newValues:{status:r.status}}});
  await audit(tx,{organizationId:u.organizationId,actorId:u.id,action:"SPEND_REQUEST_CREATED",module:"SPEND",entityType:"SPEND_REQUEST",entityId:r.id,newValues:{requestNumber:r.requestNumber,amount:r.amount,currency:r.currency,status:r.status}});
  return r;
 });
 revalidatePath("/dashboard");redirect(`/requests/${req.id}`);
}
export async function updateRequestAction(id:string,form:FormData){
 const u=await requireUser();const r=await db.spendRequest.findFirst({where:{id,organizationId:u.organizationId??undefined}});
 if(!r)throw new Error("Request not found.");if(r.requesterId!==u.id)throw new Error("Only the requester can edit this request.");
 await assertCan("MY_SPEND_REQUESTS","UPDATE",u);
 if(!["DRAFT","ACTION_REQUIRED"].includes(r.status))throw new Error("Only draft or action-required requests can be edited.");
 const title=String(form.get("title")||"").trim(),justification=String(form.get("justification")||"").trim();
 if(title.length<3||justification.length<5)throw new Error("Title and justification are required.");
 await db.$transaction(async tx=>{await tx.spendRequest.update({where:{id},data:{title,justification,version:{increment:1}}});await tx.requestHistory.create({data:{organizationId:r.organizationId,requestId:id,actorId:u.id,event:"REQUEST_UPDATED"}});await audit(tx,{organizationId:r.organizationId,actorId:u.id,action:"SPEND_REQUEST_UPDATED",module:"SPEND",entityType:"SPEND_REQUEST",entityId:id,oldValues:{title:r.title},newValues:{title}});});
 revalidatePath(`/requests/${id}`);
}
export async function decisionAction(id:string,decision:"APPROVED"|"REJECTED"|"ACTION_REQUIRED",form:FormData){
 const u=await requireUser();await assertCan("APPROVAL_REVIEW",decision==="APPROVED"?"APPROVE":decision==="REJECTED"?"REJECT":"REQUEST_INFO",u);
 const r=await db.spendRequest.findFirst({where:{id,organizationId:u.organizationId??undefined}});if(!r)throw new Error("Request not found.");
 if(r.status!=="PENDING_APPROVAL")throw new Error("Request is no longer pending approval.");
 if(r.requesterId===u.id)throw new Error("Self-approval is not allowed.");
 const comment=String(form.get("comment")||"").trim();if(decision==="REJECTED"&&!comment)throw new Error("A rejection reason is required.");if(decision==="ACTION_REQUIRED"&&!comment)throw new Error("Please provide the information required.");
 await db.$transaction(async tx=>{
  const changed=await tx.spendRequest.updateMany({where:{id,organizationId:r.organizationId,status:"PENDING_APPROVAL",version:r.version},data:{status:decision,version:{increment:1}}});
  if(changed.count!==1)throw new Error("Request changed concurrently. Refresh and try again.");
  await tx.approval.create({data:{organizationId:r.organizationId,requestId:id,approverId:u.id,decision,comment}});
  await tx.requestHistory.create({data:{organizationId:r.organizationId,requestId:id,actorId:u.id,event:`REQUEST_${decision}`,comment,oldValues:{status:r.status},newValues:{status:decision}}});
  await audit(tx,{organizationId:r.organizationId,actorId:u.id,action:`SPEND_REQUEST_${decision}`,module:"SPEND",entityType:"SPEND_REQUEST",entityId:id,oldValues:{status:r.status},newValues:{status:decision,comment}});
 });
 revalidatePath("/dashboard");revalidatePath(`/requests/${id}`);
}
export async function toggleMcpAction(form:FormData){
 const u=await requireUser();await assertCan("ORGANIZATION_LIST","UPDATE",u);
 const id=String(form.get("id"));const enabled=form.get("enabled")==="true";
 const org=await db.organization.findUnique({where:{id}});if(!org)throw new Error("Organization not found.");
 await db.$transaction(async tx=>{await tx.organization.update({where:{id},data:{mcpEnabled:enabled}});await audit(tx,{actorId:u.id,action:enabled?"MCP_ENTITLEMENT_ENABLED":"MCP_ENTITLEMENT_DISABLED",module:"MCP",entityType:"ORGANIZATION",entityId:id,oldValues:{mcpEnabled:org.mcpEnabled},newValues:{mcpEnabled:enabled}});});
 revalidatePath("/organizations");
}
