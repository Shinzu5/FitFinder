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
  },
  {
    id: "gym-2",
    name: "Iron House Fitness",
    location: "Lapu-Lapu City, Cebu",
    description: "Strength-focused training space with coaching support.",
    hours: "Mon-Sat: 5AM - 11PM",
    website: "ironhouse.fit",
    members: 218,
    pricePerMonth: 999,
    image:
      "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=80",
  },
];
