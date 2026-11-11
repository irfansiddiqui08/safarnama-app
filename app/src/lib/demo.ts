// Sample data so the app can be previewed before Supabase is set up (EXPO_PUBLIC_DEMO=1).
import type { Announcement, Enrolment, LiveClass, Me, Programme, Recording } from "./types";

const now = Date.now();
const iso = (msFromNow: number) => new Date(now + msFromNow).toISOString();
const H = 3.6e6, M = 6e4;

export const demoMe: Me = { id: "demo", email: "geeta.sharma@gmail.com", full_name: "Geeta Sharma" };

export const demoProgrammes: Programme[] = [
  { id: "chakra-healing", name: "Chakra Healing & Balancing", duration: "7 Days", is_bundle: false, sort: 30 },
  { id: "money-mastery", name: "Money Mastery Practices", duration: "3 Days", is_bundle: false, sort: 70 },
  { id: "magic-book", name: "Magic Book Practice (Daily)", duration: "Monthly", is_bundle: false, sort: 110 },
];

export const demoEnrolments: Enrolment[] = [
  { id: "e1", programme_id: "chakra-healing", valid_until: null, created_at: iso(-5 * 24 * H), programme: demoProgrammes[0] },
  { id: "e2", programme_id: "money-mastery", valid_until: null, created_at: iso(-5 * 24 * H), programme: demoProgrammes[1] },
  { id: "e3", programme_id: "magic-book", valid_until: new Date(now + 26 * 24 * H).toISOString().slice(0, 10), created_at: iso(-5 * 24 * H), programme: demoProgrammes[2] },
];

export const demoClasses: LiveClass[] = [
  { id: "c1", programme_id: "chakra-healing", title: "Chakra Healing – Day 3: Heart Chakra", starts_at: iso(8 * M), duration_min: 90, zoom_url: "https://zoom.us/j/0000000000", zoom_passcode: "safar5" },
  { id: "c2", programme_id: "money-mastery", title: "Money Mastery – Day 1: Money Mindset", starts_at: iso(26 * H), duration_min: 90, zoom_url: "https://zoom.us/j/0000000000", zoom_passcode: null },
  { id: "c3", programme_id: "magic-book", title: "Magic Book Practice – Week 2", starts_at: iso(2 * 24 * H + 3 * H), duration_min: 90, zoom_url: "https://zoom.us/j/0000000000", zoom_passcode: null },
  { id: "c4", programme_id: "chakra-healing", title: "Chakra Healing – Day 2: Solar Plexus", starts_at: iso(-21 * H), duration_min: 90, zoom_url: null, zoom_passcode: null },
  { id: "c5", programme_id: "chakra-healing", title: "Chakra Healing – Day 1: Root Chakra", starts_at: iso(-45 * H + 30 * M), duration_min: 90, zoom_url: null, zoom_passcode: null },
];

export const demoRecordings: Recording[] = [
  { id: "r1", class_id: "c4", title: "Day 2: Solar Plexus", available_until: iso(4.5 * H), class: demoClasses[3], watched: false },
  { id: "r2", class_id: "c5", title: "Day 1: Root Chakra", available_until: iso(50 * M), class: demoClasses[4], watched: true },
];

export const demoAnnouncements: Announcement[] = [
  { id: "a1", message: "🌈 11:11 Portal session की recording 24 घंटे के लिए app में उपलब्ध है।", created_at: iso(-2 * H) },
];
