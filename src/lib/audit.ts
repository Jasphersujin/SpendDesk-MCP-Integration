import { db } from "@/lib/db";
export async function audit(tx:any, data:{organizationId?:string|null;actorId?:string|null;action:string;module:string;entityType:string;entityId?:string|null;source?:"WEB"|"MCP"|"SYSTEM";oldValues?:any;newValues?:any;ipAddress?:string|null;correlationId?:string|null}){
 return tx.auditLog.create({data:{organizationId:data.organizationId??null,actorId:data.actorId??null,action:data.action,module:data.module,entityType:data.entityType,entityId:data.entityId??null,source:data.source??"WEB",oldValues:data.oldValues??undefined,newValues:data.newValues??undefined,ipAddress:data.ipAddress??null,correlationId:data.correlationId??null}});
}
