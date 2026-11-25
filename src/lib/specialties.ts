import {
  Activity,
  Baby,
  Bone,
  Brain,
  Droplets,
  Ear,
  Eye,
  Hand,
  HeartPulse,
  MessageCircleHeart,
  Pill,
  Ribbon,
  ScanFace,
  Scissors,
  Smile,
  Stethoscope,
  Utensils,
  Venus,
  Wind,
  type LucideIcon,
} from "lucide-react";
import { DOCTORS, type Doctor } from "@/lib/clinic-storage";

export type Specialty = {
  name: string;
  slug: string;
  group: string;
  icon: LucideIcon;
  color: string;
  detail?: string;
};

const colors = ["bg-peach", "bg-sage", "bg-accent", "bg-primary"] as const;

function specialty(
  name: string,
  slug: string,
  group: string,
  icon: LucideIcon,
  index: number,
): Specialty {
  return { name, slug, group, icon, color: colors[index % colors.length] };
}

export const SPECIALTIES: Specialty[] = [
  specialty("Family Medicine", "family-medicine", "Everyday care", Stethoscope, 0),
  specialty("Internal Medicine", "internal-medicine", "Everyday care", Activity, 1),
  specialty("Cardiology", "cardiology", "Heart, lungs, and hormones", HeartPulse, 2),
  specialty("Pulmonology", "pulmonology", "Heart, lungs, and hormones", Wind, 3),
  specialty("Endocrinology", "endocrinology", "Heart, lungs, and hormones", Pill, 4),
  specialty("Neurology", "neurology", "Brain and mental health", Brain, 5),
  specialty("Psychiatry", "psychiatry", "Brain and mental health", MessageCircleHeart, 6),
  specialty("Orthopedics", "orthopedics", "Bones, joints, and surgery", Bone, 7),
  specialty("Rheumatology", "rheumatology", "Bones, joints, and surgery", Hand, 8),
  specialty("General Surgery", "general-surgery", "Bones, joints, and surgery", Scissors, 9),
  specialty("Gastroenterology", "gastroenterology", "Stomach, kidneys, and urinary tract", Utensils, 10),
  specialty("Nephrology", "nephrology", "Stomach, kidneys, and urinary tract", Droplets, 11),
  specialty("Urology", "urology", "Stomach, kidneys, and urinary tract", Droplets, 12),
  specialty("Obstetrics & Gynecology", "obstetrics-gynecology", "Women and children", Venus, 13),
  specialty("Pediatrics", "pediatrics", "Women and children", Baby, 14),
  specialty("Ophthalmology", "ophthalmology", "Eyes, ears, skin, and teeth", Eye, 15),
  { ...specialty("ENT", "ent", "Eyes, ears, skin, and teeth", Ear, 16), detail: "Ear, Nose and Throat" },
  specialty("Dermatology", "dermatology", "Eyes, ears, skin, and teeth", ScanFace, 17),
  specialty("Dentistry", "dentistry", "Eyes, ears, skin, and teeth", Smile, 18),
  specialty("Oncology", "oncology", "Cancer", Ribbon, 19),
];

export const SPECIALTY_GROUPS = [...new Set(SPECIALTIES.map((item) => item.group))];

export function getSpecialty(slug: string): Specialty | undefined {
  return SPECIALTIES.find((item) => item.slug === slug);
}

export function specialtySlug(name: string): string | undefined {
  return SPECIALTIES.find((item) => item.name === name)?.slug;
}

export function doctorsInSpecialty(name: string): Doctor[] {
  return DOCTORS.filter((doctor) => doctor.specialty === name);
}
