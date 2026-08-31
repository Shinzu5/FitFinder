"use client";

/**
 * Wipe all Owner gym-scoped client state after gym delete / before a new gym.
 * Prevents clerks, coaches, shop, plans, etc. from leaking across gym lifetimes.
 */
export function clearOwnerGymLocalState() {
  if (typeof window !== "undefined") {
    const keys = [
      "fitfinder-owner-staff",
      "fitfinder-owner-coaches",
      "fitfinder-owner-equipment",
      "fitfinder-owner-plans",
      "fitfinder-owner-shop",
      "fitfinder-owner-members",
      "fitfinder-join-gym-flow",
    ];
    for (const key of keys) {
      localStorage.removeItem(key);
    }
  }

  // Dynamic imports avoid circular store init during module load
  void Promise.all([
    import("@/stores/owner-staff-store").then(({ useOwnerStaffStore }) => {
      useOwnerStaffStore.setState({ clerks: [], loading: false });
    }),
    import("@/stores/owner-coaches-store").then(({ useOwnerCoachesStore }) => {
      useOwnerCoachesStore.setState({ coaches: [], loading: false });
    }),
    import("@/stores/owner-equipment-store").then(({ useOwnerEquipmentStore }) => {
      useOwnerEquipmentStore.setState({ equipment: [], loading: false });
    }),
    import("@/stores/owner-membership-plans-store").then(
      ({ useOwnerMembershipPlansStore }) => {
        useOwnerMembershipPlansStore.setState({ plans: [], loading: false });
      },
    ),
    import("@/stores/owner-shop-store").then(({ useOwnerShopStore }) => {
      useOwnerShopStore.setState({ products: [], loading: false });
    }),
    import("@/stores/owner-members-store").then(({ useOwnerMembersStore }) => {
      useOwnerMembersStore.setState({ members: [], loading: false });
    }),
  ]);
}
