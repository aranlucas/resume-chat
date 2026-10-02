import { getProfile } from "@/lib/profile";

import { ProfileChat } from "./profile-chat";

export default async function Home() {
  return <ProfileChat profile={await getProfile()} />;
}
