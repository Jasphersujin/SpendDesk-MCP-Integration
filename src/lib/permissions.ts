import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
export async function can(screenCode:string,actionCode:string,userArg?:any){
 const user=userArg ?? await requireUser();
 if(user.roleCode==="SUPER_ADMIN") return true;
 if(!user.organizationId) return false;
 const assignments=await db.userRole.findMany({where:{userId:user.id,isActive:true,role:{isActive:true,deleted:false}},include:{role:{include:{permissions:{where:{isActive:true},include:{screen:true,actions:{where:{isActive:true,action:{isActive:true}}}}}}}}});
 return assignments.some(a=>a.role.permissions.some(p=>p.screen.code===screenCode && p.screen.isActive && p.actions.some(x=>x.action.code===actionCode)));
}
export async function assertCan(screen:string,action:string,user?:any){if(!(await can(screen,action,user)))throw new Error("FORBIDDEN");}
