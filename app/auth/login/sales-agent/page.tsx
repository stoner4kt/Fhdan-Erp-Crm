import { RoleLoginPage } from "@/components/auth/RoleLoginPage";
import { LOGIN_VARIANTS } from "../login-variants";

export default function Page() {
  return <RoleLoginPage current={LOGIN_VARIANTS.find((v) => v.slug === "sales-agent")!} variants={LOGIN_VARIANTS} />;
}
