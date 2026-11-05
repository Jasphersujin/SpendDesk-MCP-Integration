import {NextRequest,NextResponse} from "next/server";import {db} from "@/lib/db";import {createHash,timingSafeEqual} from "crypto";
export const runtime="nodejs";
export async function GET(){return NextResponse.json({name:"spenddesk-mcp",version:"1.0.0",transport:"HTTP JSON-RPC starter",tools:["create_purchase_request","get_my_requests"],notice:"Connect using a per-user bearer token. Configure token issuance before production."});}
export async function POST(req:NextRequest){
 const token=req.headers.get("authorization")?.replace(/^Bearer\s+/i,"");if(!token)return NextResponse.json({error:"Unauthorized"}, {status:401});
 const tokenHash=createHash("sha256").update(token).digest("hex");const connection=await db.mcpConnection.findFirst({where:{tokenHash,isActive:true},include:{user:{include:{organization:true,roles:{where:{isActive:true},include:{role:true}}}}}});
 if(!connection||!connection.user||connection.user.status!=="ACTIVE"||!connection.user.organization?.mcpEnabled)return NextResponse.json({error:"Invalid connection or MCP disabled"}, {status:403});
 const body=await req.json();const tool=body.tool??body.name;const args=body.arguments??body.params??{};const user=connection.user;let result:any;
 try{
  if(tool==="get_my_requests"){const rows=await db.spendRequest.findMany({where:{organizationId:user.organizationId!,requesterId:user.id},orderBy:{createdAt:"desc"},take:50});result=rows;}
  else if(tool==="create_purchase_request"){
   const amount=Number(args.amount);if(!args.title||!args.justification||!Number.isFinite(amount)||amount<=0)throw new Error("title, justification and positive amount are required.");
   const count=await db.spendRequest.count({where:{organizationId:user.organizationId!}});
   result=await db.$transaction(async tx=>{const r=await tx.spendRequest.create({data:{organizationId:user.organizationId!,requestNumber:`SD-${new Date().getFullYear()}-${String(count+1).padStart(5,"0")}`,requesterId:user.id,title:String(args.title),category:String(args.category||"General"),amount,currency:String(args.currency||"INR").toUpperCase(),priority:["LOW","NORMAL","HIGH","URGENT"].includes(args.priority)?args.priority:"NORMAL",justification:String(args.justification),status:"PENDING_APPROVAL",source:"MCP"}});await tx.requestHistory.create({data:{organizationId:user.organizationId!,requestId:r.id,actorId:user.id,event:"REQUEST_SUBMITTED_MCP"}});await tx.auditLog.create({data:{organizationId:user.organizationId,actorId:user.id,action:"SPEND_REQUEST_CREATED",module:"SPEND",entityType:"SPEND_REQUEST",entityId:r.id,source:"MCP"}});return r;});
  }else return NextResponse.json({error:"Unknown tool"}, {status:400});
  await db.mcpToolLog.create({data:{organizationId:user.organizationId!,userId:user.id,toolName:String(tool),status:"SUCCESS"}});
  return NextResponse.json({jsonrpc:"2.0",id:body.id??null,result:{content:[{type:"text",text:JSON.stringify(result)}]}});
 }catch(e:any){await db.mcpToolLog.create({data:{organizationId:user.organizationId!,userId:user.id,toolName:String(tool),status:"ERROR",errorMessage:e.message}});return NextResponse.json({error:e.message},{status:400});}
}
