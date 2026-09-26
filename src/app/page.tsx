import { toProfile, toRoles } from "@/lib/profile";
import { getResume } from "@/lib/resume";

import { ProfileChat } from "./profile-chat";

export default async function Home() {
  const resume = await getResume();
  return <ProfileChat profile={toProfile(resume)} roles={toRoles(resume)} />;
}
