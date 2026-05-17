export type LoginVariant = {
  slug: string;
  label: string;
  description: string;
};

export const LOGIN_VARIANTS = [
  { slug: "system-admin", label: "System Admin", description: "Platform and access management" },
  { slug: "manager", label: "Manager", description: "Operations and oversight" },
  { slug: "finance-officer", label: "Finance Officer", description: "Billing and payment operations" },
  { slug: "sales-agent", label: "Sales Agent", description: "Client and booking operations" },
  { slug: "fleet-coordinator", label: "Fleet Coordinator", description: "Fleet and driver dispatch" },
  { slug: "driver", label: "Driver", description: "Assigned trips and vouchers" },
] as const;
