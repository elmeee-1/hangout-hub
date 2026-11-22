/**
 * Pre-organized room templates. Every new room starts from one of these,
 * with sensible defaults (capacity, privacy, description).
 */

export type RoomTemplate = {
  key: string;
  emoji: string;
  title: string;
  tagline: string;
  description: string;
  suggestedTitle: string;
  capacity: number;
  privateByDefault: boolean;
  tags: string[];
};

export const ROOM_TEMPLATES: RoomTemplate[] = [
  {
    key: "football_5v5",
    emoji: "⚽",
    title: "5v5 Football Match",
    tagline: "Small pitch, fast game",
    description:
      "Five a side football. 10 players plus a couple of substitutes. Set the pitch, the time, and start squaring up the teams.",
    suggestedTitle: "Friday 5v5",
    capacity: 12,
    privateByDefault: false,
    tags: ["football", "sport", "team"],
  },
  {
    key: "football_7v7",
    emoji: "🥅",
    title: "7v7 Football Match",
    tagline: "Bigger pitch, bigger squads",
    description:
      "Seven a side football for when 14 people show up. Organize positions, collect who is in, and pick a keeper.",
    suggestedTitle: "Sunday 7v7",
    capacity: 16,
    privateByDefault: false,
    tags: ["football", "sport", "team"],
  },
  {
    key: "gaming_cyber",
    emoji: "🎮",
    title: "Gaming Night (Cybercafé)",
    tagline: "LAN party at the cyber",
    description:
      "Book a row of PCs at the cybercafé and play together: FIFA, COD, CS, whatever the group votes on. Agree on hours and budget first.",
    suggestedTitle: "Cyber night",
    capacity: 8,
    privateByDefault: false,
    tags: ["gaming", "chill"],
  },
  {
    key: "picnic_montazah",
    emoji: "🧺",
    title: "Montazah Picnic",
    tagline: "Outdoor day at the park",
    description:
      "Classic Montazah picnic day: bring blankets, food, music, a ball and sunscreen. Share the shopping list and the meeting spot in the room.",
    suggestedTitle: "Montazah picnic",
    capacity: 15,
    privateByDefault: false,
    tags: ["outdoors", "picnic", "chill"],
  },
  {
    key: "coffee_break",
    emoji: "☕",
    title: "Coffee Break",
    tagline: "Quick coffee between classes",
    description:
      "A short coffee break near campus. Perfect for catching up between lectures or after an exam.",
    suggestedTitle: "Coffee break",
    capacity: 6,
    privateByDefault: false,
    tags: ["social", "chill"],
  },
  {
    key: "date_ideas",
    emoji: "💫",
    title: "Date Ideas",
    tagline: "Private room, just for two",
    description:
      "Plan a date with ideas, places and times. Private by design: only invited people can ever see or join this room.",
    suggestedTitle: "Our plan",
    capacity: 2,
    privateByDefault: true,
    tags: ["private", "date"],
  },
];

export function getTemplate(key: string): RoomTemplate | undefined {
  return ROOM_TEMPLATES.find(function (t) { return t.key === key; });
}
