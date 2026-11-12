import { FarmerProfileView } from "@/features/profile/components/FarmerProfileView";
import { RentalOwnerProfileView } from "@/features/profile/components/RentalOwnerProfileView";
import { BankerProfileView } from "@/features/profile/components/BankerProfileView";
import { AdminProfileView } from "@/features/profile/components/AdminProfileView";
import type { ProfileDto } from "@/types/profile";

// A switch on the discriminated union (not a Record<Role, ComponentType>) so
// each branch narrows to its own DTO shape and passes it to the matching
// view untyped-cast-free; the `never` default still gives the same
// exhaustiveness guarantee as Sidebar's SECTIONS_BY_ROLE Record pattern - a 5th
// role added to ProfileDto without a new branch here fails to compile.
export function ProfileByRole({ profile }: { profile: ProfileDto }) {
  switch (profile.role) {
    case "FARMER":
      return <FarmerProfileView profile={profile} />;
    case "RENTAL_OWNER":
      return <RentalOwnerProfileView profile={profile} />;
    case "BANKER":
      return <BankerProfileView profile={profile} />;
    case "ADMIN":
      return <AdminProfileView profile={profile} />;
    default: {
      const _exhaustive: never = profile;
      return _exhaustive;
    }
  }
}
