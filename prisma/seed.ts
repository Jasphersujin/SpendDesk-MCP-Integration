import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
// const db=new PrismaClient();
const db = new PrismaClient({
  log: ["error", "warn"],
});
async function main() {
  const actions = [
    "VIEW",
    "CREATE",
    "UPDATE",
    "DELETE",
    "ACTIVATE",
    "DEACTIVATE",
    "APPROVE",
    "REJECT",
    "REQUEST_INFO",
    "EXPORT",
    "RESTORE",
    "MANAGE_CONNECTION",
  ];
  const actionMap: any = {};
  for (const code of actions)
    actionMap[code] = await db.action.upsert({
      where: { code },
      update: { displayName: code.replaceAll("_", " ") },
      create: { code, displayName: code.replaceAll("_", " ") },
    });
  const sections: any = {};
  for (const [code, name] of [
    ["ORGANIZATION", "Organization"],
    ["ACCESS_CONTROL", "Access Control"],
    ["SYSTEM_CONFIGURATION", "System Configuration"],
    ["SPEND_MANAGEMENT", "Spend Management"],
    ["INTEGRATIONS", "Integrations"],
    ["GOVERNANCE", "Governance"],
  ])
    sections[code] = await db.sidebarSection.upsert({
      where: { code },
      update: { displayName: name },
      create: { code, displayName: name },
    });
  //  const menuDefs=[
  //  ["ORGANIZATION_LIST","Organizations","ORGANIZATION","/organizations","ORGANIZATION_LIST"],
  //  ["USER_LIST","Users","ORGANIZATION","/users","USER_LIST"],
  //  ["ROLE_LIST","Roles","ACCESS_CONTROL","/access-control","ROLE_LIST"],
  //  ["SPEND_DASHBOARD","Spend Dashboard","SPEND_MANAGEMENT","/dashboard","SPEND_DASHBOARD"],
  //  ["SPEND_REQUEST_CREATE","New Request","SPEND_MANAGEMENT","/requests/new","SPEND_REQUEST_CREATE"],
  //  ["MY_SPEND_REQUESTS","My Requests","SPEND_MANAGEMENT","/dashboard","MY_SPEND_REQUESTS"],
  //  ["APPROVAL_REVIEW","Approvals","SPEND_MANAGEMENT","/dashboard","APPROVAL_REVIEW"],
  //  ["DEPARTMENT_BUDGET_LIST","Budgets","SPEND_MANAGEMENT","/budgets","DEPARTMENT_BUDGET_LIST"],
  //  ["MCP_ORG_SETTINGS","MCP Integration","INTEGRATIONS","/integrations","MCP_ORG_SETTINGS"],
  //  ["AUDIT_LOG","Audit Logs","GOVERNANCE","/audit-logs","AUDIT_LOG"]
  //  ];

  const menuDefs = [
    [
      "ORGANIZATION_LIST",
      "Organizations",
      "ORGANIZATION",
      "/organizations",
      "ORGANIZATION_LIST",
    ],
    ["USER_LIST", "Users", "ORGANIZATION", "/users", "USER_LIST"],
    ["ROLE_LIST", "Roles", "ACCESS_CONTROL", "/access-control", "ROLE_LIST"],

    [
      "SPEND_DASHBOARD",
      "Spend Dashboard",
      "SPEND_MANAGEMENT",
      "/dashboard",
      "SPEND_DASHBOARD",
    ],
    [
      "SPEND_REQUEST_CREATE",
      "New Request",
      "SPEND_MANAGEMENT",
      "/requests/new",
      "SPEND_REQUEST_CREATE",
    ],
    [
      "MY_SPEND_REQUESTS",
      "My Requests",
      "SPEND_MANAGEMENT",
      "/requests/my-requests",
      "MY_SPEND_REQUESTS",
    ],
    [
      "APPROVAL_REVIEW",
      "Approvals",
      "SPEND_MANAGEMENT",
      "/requests/approvals",
      "APPROVAL_REVIEW",
    ],

    [
      "DEPARTMENT_BUDGET_LIST",
      "Budgets",
      "SPEND_MANAGEMENT",
      "/budgets",
      "DEPARTMENT_BUDGET_LIST",
    ],
    [
      "MCP_ORG_SETTINGS",
      "MCP Integration",
      "INTEGRATIONS",
      "/integrations",
      "MCP_ORG_SETTINGS",
    ],
    ["AUDIT_LOG", "Audit Logs", "GOVERNANCE", "/audit-logs", "AUDIT_LOG"],
  ];

  const screenMap: any = {};
  for (const [code, name, sec, route, screenCode] of menuDefs) {
    const menu = await db.menu.upsert({
      where: { code },
      update: {
        displayName: name,
        route,
        sectionId: sections[sec as string].id,
      },
      create: {
        code,
        displayName: name,
        route,
        sectionId: sections[sec as string].id,
      },
    });
    screenMap[screenCode] = await db.screen.upsert({
      where: { code: screenCode },
      update: { displayName: name, route, menuId: menu.id, isDefault: true },
      create: {
        code: screenCode,
        displayName: name,
        route,
        menuId: menu.id,
        isDefault: true,
      },
    });
  }
  const screenActions: any = {};
  const mappings: any = {
    ORGANIZATION_LIST: ["VIEW", "CREATE", "UPDATE", "ACTIVATE", "DEACTIVATE"],
    USER_LIST: ["VIEW", "CREATE", "UPDATE", "ACTIVATE", "DEACTIVATE"],
    ROLE_LIST: ["VIEW", "CREATE", "UPDATE", "DEACTIVATE"],
    SPEND_DASHBOARD: ["VIEW"],
    SPEND_REQUEST_CREATE: ["CREATE"],
    MY_SPEND_REQUESTS: ["VIEW", "UPDATE"],
    APPROVAL_REVIEW: ["VIEW", "APPROVE", "REJECT", "REQUEST_INFO"],
    DEPARTMENT_BUDGET_LIST: ["VIEW", "CREATE", "UPDATE"],
    MCP_ORG_SETTINGS: ["VIEW", "MANAGE_CONNECTION"],
    AUDIT_LOG: ["VIEW", "EXPORT"],
  };
  for (const [s, acts] of Object.entries(mappings)) {
    for (const a of acts as string[]) {
      const sa = await db.screenAction.upsert({
        where: {
          screenId_actionId: {
            screenId: screenMap[s].id,
            actionId: actionMap[a].id,
          },
        },
        update: { isActive: true },
        create: { screenId: screenMap[s].id, actionId: actionMap[a].id },
      });
      screenActions[`${s}:${a}`] = sa;
    }
  }
  const orgDefs = [
    [
      "SD-ACME",
      "Acme Technologies",
      "Technology",
      "ava.admin@acme.demo",
      "ethan.employee@acme.demo",
      true,
    ],
    [
      "SD-NORTH",
      "Northstar Manufacturing",
      "Manufacturing",
      "noah.admin@northstar.demo",
      "mia.employee@northstar.demo",
      false,
    ],
    [
      "SD-GREEN",
      "GreenLeaf Retail",
      "Retail",
      "olivia.admin@greenleaf.demo",
      "liam.employee@greenleaf.demo",
      true,
    ],
    [
      "SD-FIN",
      "FinEdge Services",
      "Financial Services",
      "sophia.admin@finedge.demo",
      "lucas.employee@finedge.demo",
      false,
    ],
    [
      "SD-ORBIT",
      "Orbit Logistics",
      "Logistics",
      "isabella.admin@orbit.demo",
      "mason.employee@orbit.demo",
      true,
    ],
  ] as const;
  const orgs: any[] = [];
  for (const [code, name, industry, email, employeeEmail, mcp] of orgDefs) {
    orgs.push(
      await db.organization.upsert({
        where: { code },
        update: { name, industry, email, mcpEnabled: mcp },
        create: { code, name, industry, email, mcpEnabled: mcp },
      }),
    );
  }
//   const platformRole = await db.role.upsert({
//     where: {
//       code_organizationId: { code: "SUPER_ADMIN", organizationId: null },
//     },
//     update: {
//       displayName: "Super Admin",
//       roleLevel: "PLATFORM",
//       accessibility: "GLOBAL",
//       isSystem: true,
//     },
//     create: {
//       code: "SUPER_ADMIN",
//       displayName: "Super Admin",
//       roleLevel: "PLATFORM",
//       accessibility: "GLOBAL",
//       isSystem: true,
//     },
//   });

const existingPlatformRole = await db.role.findFirst({
  where: {
    code: "SUPER_ADMIN",
    organizationId: null
  }
});

const platformRole = existingPlatformRole
  ? await db.role.update({
      where: {
        id: existingPlatformRole.id
      },
      data: {
        displayName: "Super Admin",
        roleLevel: "PLATFORM",
        accessibility: "GLOBAL",
        isSystem: true,
        isActive: true,
        deleted: false
      }
    })
  : await db.role.create({
      data: {
        code: "SUPER_ADMIN",
        displayName: "Super Admin",
        roleLevel: "PLATFORM",
        accessibility: "GLOBAL",
        isSystem: true,
        isActive: true,
        deleted: false,
        organizationId: null
      }
    });
  
const passwordHash = await bcrypt.hash("Welcome123!", 12);
  const platform = await db.user.upsert({
    where: { email: "platform.admin@spenddesk.demo" },
    update: { passwordHash, status: "ACTIVE" },
    create: {
      email: "platform.admin@spenddesk.demo",
      firstName: "Platform",
      lastName: "Administrator",
      passwordHash,
      status: "ACTIVE",
    },
  });
  await db.userRole.upsert({
    where: { userId_roleId: { userId: platform.id, roleId: platformRole.id } },
    update: { isActive: true },
    create: { userId: platform.id, roleId: platformRole.id },
  });
  for (const org of orgs) {
    for (const [code, name] of [
      ["ORGANIZATION_ADMIN", "Organization Admin"],
      ["EMPLOYEE", "Employee"],
    ]) {
      await db.role.upsert({
        where: { code_organizationId: { code, organizationId: org.id } },
        update: {
          displayName: name,
          roleLevel: "ORGANIZATION",
          accessibility: "TENANT",
          isSystem: true,
        },
        create: {
          code,
          displayName: name,
          roleLevel: "ORGANIZATION",
          accessibility: "TENANT",
          organizationId: org.id,
          isSystem: true,
        },
      });
    }
    const adminRole = await db.role.findUniqueOrThrow({
      where: {
        code_organizationId: {
          code: "ORGANIZATION_ADMIN",
          organizationId: org.id,
        },
      },
    });
    const employeeRole = await db.role.findUniqueOrThrow({
      where: {
        code_organizationId: { code: "EMPLOYEE", organizationId: org.id },
      },
    });
    const adminEmail = orgDefs.find((x) => x[0] === org.code)![3],
      empEmail = orgDefs.find((x) => x[0] === org.code)![4];
    const admin = await db.user.upsert({
      where: { email: adminEmail },
      update: { organizationId: org.id, passwordHash, status: "ACTIVE" },
      create: {
        organizationId: org.id,
        email: adminEmail,
        firstName: org.name.split(" ")[0],
        lastName: "Admin",
        department: "Finance",
        passwordHash,
        status: "ACTIVE",
      },
    });
    const employee = await db.user.upsert({
      where: { email: empEmail },
      update: { organizationId: org.id, passwordHash, status: "ACTIVE" },
      create: {
        organizationId: org.id,
        email: empEmail,
        firstName: "Demo",
        lastName: "Employee",
        department: "Engineering",
        passwordHash,
        status: "ACTIVE",
      },
    });
    await db.userRole.upsert({
      where: { userId_roleId: { userId: admin.id, roleId: adminRole.id } },
      update: { isActive: true },
      create: { userId: admin.id, roleId: adminRole.id },
    });
    await db.userRole.upsert({
      where: {
        userId_roleId: { userId: employee.id, roleId: employeeRole.id },
      },
      update: { isActive: true },
      create: { userId: employee.id, roleId: employeeRole.id },
    });
    const grants: any = {
      ORGANIZATION_ADMIN: {
        USER_LIST: ["VIEW", "CREATE", "UPDATE", "ACTIVATE", "DEACTIVATE"],
        SPEND_DASHBOARD: ["VIEW"],
        MY_SPEND_REQUESTS: ["VIEW"],
        APPROVAL_REVIEW: ["VIEW", "APPROVE", "REJECT", "REQUEST_INFO"],
        DEPARTMENT_BUDGET_LIST: ["VIEW", "CREATE", "UPDATE"],
        MCP_ORG_SETTINGS: ["VIEW"],
        AUDIT_LOG: ["VIEW"],
      },
      EMPLOYEE: {
        SPEND_REQUEST_CREATE: ["CREATE"],
        MY_SPEND_REQUESTS: ["VIEW", "UPDATE"],
        MCP_ORG_SETTINGS: ["VIEW", "MANAGE_CONNECTION"],
      },
    };
    for (const [roleCode, screenGrants] of Object.entries(grants)) {
      const role = roleCode === "ORGANIZATION_ADMIN" ? adminRole : employeeRole;
      for (const [s, acts] of Object.entries(screenGrants as any)) {
        const perm = await db.rolePermission.upsert({
          where: {
            roleId_screenId: { roleId: role.id, screenId: screenMap[s].id },
          },
          update: { isActive: true },
          create: { roleId: role.id, screenId: screenMap[s].id },
        });
        for (const a of acts as string[]) {
          await db.rolePermissionAction.upsert({
            where: {
              rolePermissionId_actionId: {
                rolePermissionId: perm.id,
                actionId: actionMap[a].id,
              },
            },
            update: { isActive: true },
            create: { rolePermissionId: perm.id, actionId: actionMap[a].id },
          });
        }
      }
    }
    for (const dept of ["Engineering", "Finance", "Marketing"]) {
      await db.budget.upsert({
        where: {
          organizationId_department_fiscalYear: {
            organizationId: org.id,
            department: dept,
            fiscalYear: 2026,
          },
        },
        update: {},
        create: {
          organizationId: org.id,
          department: dept,
          fiscalYear: 2026,
          allocated: dept === "Engineering" ? 500000 : 250000,
          committed: 0,
          currency: "INR",
        },
      });
    }
    const existing = await db.spendRequest.count({
      where: { organizationId: org.id },
    });
    if (existing === 0) {
      const r = await db.spendRequest.create({
        data: {
          organizationId: org.id,
          requestNumber: `SD-2026-${org.code}-00001`,
          requesterId: employee.id,
          title: "Developer workstation",
          category: "IT Equipment",
          amount: 125000,
          currency: "INR",
          priority: "HIGH",
          vendor: "Demo Systems",
          justification:
            "Workstation required for product development and testing.",
          status: "PENDING_APPROVAL",
          source: "WEB",
        },
      });
      await db.requestHistory.create({
        data: {
          organizationId: org.id,
          requestId: r.id,
          actorId: employee.id,
          event: "REQUEST_SUBMITTED",
        },
      });
    }
  }
  // Global platform grants across global screens only
  for (const [s, acts] of Object.entries({
    ORGANIZATION_LIST: ["VIEW", "CREATE", "UPDATE", "ACTIVATE", "DEACTIVATE"],
    USER_LIST: ["VIEW", "CREATE", "UPDATE"],
    ROLE_LIST: ["VIEW", "CREATE", "UPDATE"],
    AUDIT_LOG: ["VIEW", "EXPORT"],
  })) {
    const perm = await db.rolePermission.upsert({
      where: {
        roleId_screenId: { roleId: platformRole.id, screenId: screenMap[s].id },
      },
      update: { isActive: true },
      create: { roleId: platformRole.id, screenId: screenMap[s].id },
    });
    for (const a of acts as string[]) {
      await db.rolePermissionAction.upsert({
        where: {
          rolePermissionId_actionId: {
            rolePermissionId: perm.id,
            actionId: actionMap[a].id,
          },
        },
        update: { isActive: true },
        create: { rolePermissionId: perm.id, actionId: actionMap[a].id },
      });
    }
  }
  console.log(
    "Seed complete: 5 organizations, 11 users, roles, screens, actions, permissions, budgets and demo requests.",
  );
}
main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
