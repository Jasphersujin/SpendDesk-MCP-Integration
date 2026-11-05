import Link from "next/link";
import {requireUser} from "@/lib/auth";
import {logoutAction} from "@/lib/actions";
export async function Shell({children}:{children:React.ReactNode}){
 const u=await requireUser();const platform=u.roleCode==="SUPER_ADMIN";
 const links=platform?[["Dashboard","/dashboard"],["Organizations","/organizations"],["Users","/users"],["Access Control","/access-control"],["Audit Logs","/audit-logs"]]:u.roleCode==="ORGANIZATION_ADMIN"?[["Dashboard","/dashboard"],["Users","/users"],["Spend Requests","/dashboard"],["Budgets","/budgets"],["MCP Integration","/integrations"],["Audit Logs","/audit-logs"]]:[["Dashboard","/dashboard"],["New Request","/requests/new"],["My Requests","/dashboard"],["Claude Connection","/integrations"]];
 return <div className="layout"><aside className="sidebar"><h2 style={{fontSize:22,fontWeight:800,margin:"0 8px 24px"}}>SpendDesk</h2><div className="group muted" style={{padding:"0 12px 8px",fontSize:11}}>WORKSPACE</div>{links.map(([label,href])=><Link key={label} href={href}>{label}</Link>)}<div style={{marginTop:24,padding:10,fontSize:12,color:"#b8c8d8"}}>{u.name}<br/>{u.roleCode}</div></aside><div className="main"><header className="topbar"><strong>{u.organizationName}</strong><form action={logoutAction}><button className="btn secondary">Sign out</button></form></header><main className="content">{children}</main></div></div>
}
