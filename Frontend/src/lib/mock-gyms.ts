export type GymStatus = "ACTIVE" | "PENDING";

export interface Gym {
  id: string;
  name: string;
  location: string;
  description: string;
  hours: string;
  website: string;
  members: number;
  pricePerMonth: number;
  image: string;
  status?: GymStatus;
}

export const mockGyms: Gym[] = [
  {
    id: "gym-1",
    name: "Abbsy Mini Gym",
    location: "Datag Buagsong, Cordova",
    description: "A community-focused mini gym with top-tier equipment.",
    hours: "Mon-Sun: 6AM - 10PM",
    website: "abbsy.gym",
    members: 142,
    pricePerMonth: 799,
    image:
      "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=80",
    status: "ACTIVE",
  },
  {
    id: "gym-2",
    name: "Flex Fitness Studio",
    location: "Mandaue City, Cebu",
    description: "Boutique studio with group classes and open gym access.",
    hours: "Mon-Fri: 6AM - 9PM",
    website: "flexfit.studio",
    members: 0,
    pricePerMonth: 899,
    image:
      "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?auto=format&fit=crop&w=1200&q=80",
    status: "PENDING",
  },
  {
    id: "gym-3",
    name: "The Iron Den",
    location: "Cebu City, Cebu",
    description: "Hardcore lifting environment built for serious strength athletes.",
    hours: "Mon-Sat: 5AM - 11PM",
    website: "ironden.fit",
    members: 87,
    pricePerMonth: 549,
    image:
      "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80",
    status: "ACTIVE",
  },
  {
    id: "gym-4",
    name: "The Zone Fitness",
    location: "Lapu-Lapu City, Cebu",
    description: "Modern fitness hub with cardio zones, free weights, and recovery area.",
    hours: "Mon-Sun: 6AM - 10PM",
    website: "thezone.fit",
    members: 203,
    pricePerMonth: 699,
    image:
      "https://images.unsplash.com/photo-1540497077202-7bf8a76381cd?auto=format&fit=crop&w=1200&q=80",
    status: "ACTIVE",
  },
];
